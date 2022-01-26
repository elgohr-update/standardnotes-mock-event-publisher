import * as winston from 'winston'
import * as AWS from 'aws-sdk'
import { Container } from 'inversify'
import { TimerInterface, Timer } from '@standardnotes/time'

import { Env } from './Env'
import TYPES from './Types'
import { SNSDomainEventPublisher } from '@standardnotes/domain-events-infra'

export class ContainerConfigLoader {
  async load(): Promise<Container> {
    const env: Env = new Env()
    env.load()

    const container = new Container()

    const logger = winston.createLogger({
      level: env.get('LOG_LEVEL') || 'info',
      format: winston.format.combine(
        winston.format.splat(),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({ level: env.get('LOG_LEVEL') || 'info' }),
      ],
    })
    container.bind<winston.Logger>(TYPES.Logger).toConstantValue(logger)

    container.bind<AWS.SNS>(TYPES.SNS).toConstantValue(new AWS.SNS({
      apiVersion: 'latest',
      endpoint: env.get('SNS_ENDPOINT'),
      sslEnabled: false,
      region: env.get('SNS_AWS_REGION'),
      credentials: {
        secretAccessKey: env.get('SNS_AWS_SECRET_ACCESS_KEY'),
        accessKeyId: env.get('SNS_AWS_ACCESS_KEY_ID'),
      },
    }))

    // env vars
    container.bind(TYPES.SNS_TOPIC_ARN).toConstantValue(env.get('SNS_TOPIC_ARN'))
    container.bind(TYPES.SNS_AWS_REGION).toConstantValue(env.get('SNS_AWS_REGION'))
    container.bind(TYPES.SNS_ENDPOINT).toConstantValue(env.get('SNS_ENDPOINT'))
    container.bind(TYPES.SNS_AWS_SECRET_ACCESS_KEY).toConstantValue(env.get('SNS_AWS_SECRET_ACCESS_KEY'))
    container.bind(TYPES.SNS_AWS_ACCESS_KEY_ID).toConstantValue(env.get('SNS_AWS_ACCESS_KEY_ID'))
    container.bind(TYPES.VERSION).toConstantValue(env.get('VERSION'))

    container.bind<TimerInterface>(TYPES.Timer).toConstantValue(new Timer())

    container.bind<SNSDomainEventPublisher>(TYPES.DomainEventPublisher).toConstantValue(
      new SNSDomainEventPublisher(
        container.get(TYPES.SNS),
        container.get(TYPES.SNS_TOPIC_ARN)
      )
    )

    return container
  }
}
