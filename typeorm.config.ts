import { DataSource } from 'typeorm'
import { Contract } from './src/model/generated/contract.model'
import { GameStartedEvent } from './src/model/generated/gameStartedEvent.model'
import { GuessSubmittedEvent } from './src/model/generated/guessSubmittedEvent.model'
import { ClueGivenEvent } from './src/model/generated/clueGivenEvent.model'
import { Game } from './src/model/generated/game.model'

const dbConfig = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  entities: [Contract, GameStartedEvent, GuessSubmittedEvent, ClueGivenEvent, Game],
  migrations: [__dirname + '/db/migrations/*.js'],
  migrationsTableName: 'migrations'
})

export default dbConfig
