import neo4j, { Driver } from 'neo4j-driver';
import { isNeo4jConfigured } from './config';

let driverInstance: Driver | null = null;

/** Driver singleton para el runtime del servidor. No usar en el cliente. */
export function getNeo4jDriver(): Driver | null {
  if (!isNeo4jConfigured()) {
    return null;
  }
  if (!driverInstance) {
    const uri = process.env.NEO4J_URI!.trim();
    const user = process.env.NEO4J_USER!.trim();
    const password = process.env.NEO4J_PASSWORD!;
    driverInstance = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driverInstance;
}
