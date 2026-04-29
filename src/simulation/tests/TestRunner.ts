import type { Project, TestSuite, TestCase } from '@/types';
import { SimulationEngine } from '@/simulation/engine/SimulationEngine';

export class TestRunner {
  private engine: SimulationEngine;
  private currentTestLogs: string[] = [];
  
  constructor(private project: Project) {
    this.engine = new SimulationEngine();
    // We run tests in a standalone engine instance to avoid modifying UI state
    // We must clone the components so they are fresh
    const components = JSON.parse(JSON.stringify(project.canvas.components));
    const connections = JSON.parse(JSON.stringify(project.canvas.connections));
    
    this.engine.loadComponents(components);
    this.engine.loadConnections(connections);
    // Do not start the loop, we will manually step it
  }

  async runSuite(suite: TestSuite, onUpdate: (suite: TestSuite) => void): Promise<TestSuite> {
    const updatedSuite = { ...suite, overallStatus: 'running' as TestSuite['overallStatus'], tests: [] as TestCase[] };
    onUpdate({ ...updatedSuite });

    const testsToRun: { name: string, fn: () => Promise<void> }[] = [];

    const context = {
      describe: (name: string, fn: () => void) => {
         fn();
      },
      it: (name: string, fn: () => Promise<void>) => {
         testsToRun.push({ name, fn });
      },
      expect: (actual: any) => ({
         toBe: (expected: any) => {
            if (actual !== expected) {
               throw new Error(`Expected ${expected} but got ${actual}`);
            }
         },
         toBeGreaterThan: (expected: number) => {
            if (actual <= expected) {
               throw new Error(`Expected > ${expected} but got ${actual}`);
            }
         },
         toBeLessThan: (expected: number) => {
            if (actual >= expected) {
               throw new Error(`Expected < ${expected} but got ${actual}`);
            }
         }
      }),
      wait: async (virtualMs: number) => {
         // Advance virtual time by stepping the engine
         const targetTime = this.engine.getTime() + (virtualMs * 1000);
         let safety = 0;
         while (this.engine.getTime() < targetTime && safety < 100000) {
            this.engine.step();
            safety++;
         }
      },
      components: (nameOrId: string) => {
         const comp = this.project.canvas.components.find(c => c.id === nameOrId || c.name === nameOrId);
         if (!comp) throw new Error(`Component '${nameOrId}' not found`);
         
         return {
            pin: (pinName: string) => {
               return {
                  get: () => {
                     const snapshot = this.engine.getSnapshot();
                     const state = snapshot.components[comp.id];
                     if (!state) return undefined;
                     return state.pinValues[pinName];
                  },
                  set: (v: any) => {
                     this.engine.setInput(comp.id, pinName, v);
                     // step once to propagate
                     this.engine.step();
                  }
               }
            }
         }
      },
      log: (msg: string) => {
         this.currentTestLogs.push(msg);
      }
    };

    try {
      // Parse DSL
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const fn = new AsyncFunction(...Object.keys(context), suite.code);
      await fn(...Object.values(context));

      // Run registered tests sequentially
      for (const t of testsToRun) {
         const testCase: TestCase = {
            id: `test_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            name: t.name,
            status: 'running'
         };
         updatedSuite.tests.push(testCase);
         onUpdate({ ...updatedSuite });
         
         const startTime = performance.now();
         this.currentTestLogs = [];
         
         try {
            await t.fn();
            testCase.status = 'pass';
         } catch (e: any) {
            testCase.status = 'fail';
            testCase.error = e.message;
         }
         
         testCase.duration = performance.now() - startTime;
         testCase.logs = [...this.currentTestLogs];
         onUpdate({ ...updatedSuite });
      }

      const passes = updatedSuite.tests.filter(t => t.status === 'pass').length;
      updatedSuite.passRate = updatedSuite.tests.length ? (passes / updatedSuite.tests.length) * 100 : 0;
      updatedSuite.overallStatus = updatedSuite.tests.every(t => t.status === 'pass') ? 'pass' : 'fail';
      
    } catch (e: any) {
      updatedSuite.overallStatus = 'error';
      updatedSuite.tests.push({
         id: 'error',
         name: 'Suite Execution Error',
         status: 'error',
         error: e.message
      });
    }
    
    onUpdate({ ...updatedSuite });
    return updatedSuite;
  }
}
