import neo4j, { Driver } from 'neo4j-driver';
import { getNeo4jPassword, getNeo4jUri, getNeo4jUser, isNeo4jConfigured } from './config';

let driverInstance: Driver | null = null;

/** Driver singleton para el runtime del servidor. No usar en el cliente. */
export function getNeo4jDriver(): Driver | null {
  if (!isNeo4jConfigured()) {
    return null;
  }
  if (!driverInstance) {
    const uri = getNeo4jUri()!;
    const user = getNeo4jUser()!;
    const password = getNeo4jPassword()!;
    driverInstance = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driverInstance;
}
