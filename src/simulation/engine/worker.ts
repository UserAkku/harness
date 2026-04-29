import { expose } from 'comlink';
import { SimulationEngine } from './SimulationEngine';

const engine = new SimulationEngine();

expose(engine);
