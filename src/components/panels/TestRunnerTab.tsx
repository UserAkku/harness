'use client';

import React, { useState } from 'react';
import { Play, Plus, Trash2, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { useProjectStore } from '@/stores/useProjectStore';
import { TestRunner } from '@/simulation/tests/TestRunner';
import type { TestSuite } from '@/types';
import { v4 as uuid } from 'uuid';

const defaultTestCode = `describe('Smoke Test', () => {
  it('Should toggle output when input triggers', async () => {
    // wait for system to boot
    await wait(100); 
    
    // assert initial state (assuming an LED component exists)
    // expect(components('LEDLamp').pin('state').get()).toBe(0);

    // trigger input
    // components('GenericMCU').pin('pin1').set(1);

    // wait for logic to process
    // await wait(50);

    // assert final state
    // expect(components('LEDLamp').pin('state').get()).toBe(1);
  });
});`;

export function TestResultsTab() {
  const project = useProjectStore(s => s.project);
  const addTestSuite = useProjectStore(s => s.addTestSuite);
  const updateTestSuite = useProjectStore(s => s.updateTestSuite);
  const removeTestSuite = useProjectStore(s => s.removeTestSuite);
  
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | null>(null);

  if (!project) return null;

  const tests = project.tests || [];
  const selectedSuite = tests.find(t => t.id === selectedSuiteId) || tests[0];

  const handleCreateSuite = () => {
    const newSuite: TestSuite = {
      id: uuid(),
      name: `Test Suite ${tests.length + 1}`,
      code: defaultTestCode,
      tests: [],
      overallStatus: 'pending',
    };
    addTestSuite(newSuite);
    setSelectedSuiteId(newSuite.id);
  };

  const handleRunSuite = async (suite: TestSuite) => {
    if (!project) return;
    const runner = new TestRunner(project);
    await runner.runSuite(suite, (updated) => {
      updateTestSuite(suite.id, updated);
    });
  };

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar - Suites List */}
      <div className="w-48 border-r-[3px] border-black flex flex-col shrink-0 bg-white">
        <div className="p-3 border-b-[3px] border-black flex items-center justify-between bg-gray-100">
          <span className="text-[10px] font-black uppercase tracking-widest text-black">SUITES</span>
          <button onClick={handleCreateSuite} className="p-1 text-black hover:bg-black hover:text-white border-[3px] border-transparent hover:border-black transition-colors">
            <Plus size={14} strokeWidth={3} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tests.length === 0 ? (
            <div className="p-6 text-center text-xs font-bold text-gray-500 uppercase tracking-widest">NO SUITES</div>
          ) : (
            tests.map(suite => (
              <button
                key={suite.id}
                onClick={() => setSelectedSuiteId(suite.id)}
                className={`w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest border-b-[3px] border-black transition-colors flex items-center gap-3 ${
                  selectedSuiteId === suite.id || (!selectedSuiteId && selectedSuite === suite)
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                {suite.overallStatus === 'pass' && <CheckCircle size={14} strokeWidth={3} className="text-green-500" />}
                {suite.overallStatus === 'fail' && <XCircle size={14} strokeWidth={3} className="text-red-500" />}
                {suite.overallStatus === 'error' && <AlertCircle size={14} strokeWidth={3} className="text-yellow-500" />}
                {suite.overallStatus === 'pending' && <Clock size={14} strokeWidth={3} className="text-gray-500" />}
                {suite.overallStatus === 'running' && <span className="w-3 h-3 bg-yellow-400 border-[2px] border-black shrink-0" />}
                <span className="truncate flex-1">{suite.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Area */}
      {selectedSuite ? (
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="px-4 py-3 border-b-[3px] border-black flex items-center justify-between shrink-0 bg-white">
            <input
              type="text"
              value={selectedSuite.name}
              onChange={(e) => updateTestSuite(selectedSuite.id, { name: e.target.value })}
              className="bg-white px-3 py-2 text-base font-black uppercase text-black outline-none border-[3px] border-black focus:ring-4 focus:ring-gray-200"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleRunSuite(selectedSuite)}
                disabled={selectedSuite.overallStatus === 'running'}
                className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-black border-[3px] border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:hover:bg-black disabled:hover:text-white"
              >
                <Play size={12} fill="currentColor" />
                RUN SUITE
              </button>
              <button
                onClick={() => {
                  removeTestSuite(selectedSuite.id);
                  if (selectedSuiteId === selectedSuite.id) setSelectedSuiteId(null);
                }}
                className="p-2 text-black bg-white border-[3px] border-black hover:bg-red-500 hover:text-white transition-colors"
              >
                <Trash2 size={16} strokeWidth={3} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex min-h-0">
            {/* Code Editor */}
            <div className="flex-1 border-r-[3px] border-black flex flex-col min-w-0 bg-white">
              <div className="px-3 py-2 bg-gray-100 border-b-[3px] border-black shrink-0 text-[10px] font-black uppercase tracking-widest text-black">
                TEST_DSL.JS
              </div>
              <textarea
                value={selectedSuite.code}
                onChange={(e) => updateTestSuite(selectedSuite.id, { code: e.target.value })}
                className="flex-1 w-full p-4 text-xs font-mono bg-white text-black outline-none resize-none leading-relaxed focus:ring-4 focus:ring-gray-200"
                spellCheck={false}
              />
            </div>

            {/* Results */}
            <div className="w-96 flex flex-col bg-gray-50 shrink-0">
              <div className="px-4 py-3 border-b-[3px] border-black shrink-0 flex items-center justify-between bg-white">
                <span className="text-[10px] font-black uppercase tracking-widest text-black">RESULTS</span>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 border-[2px] border-black ${
                  selectedSuite.overallStatus === 'pass' ? 'bg-green-500 text-black' :
                  selectedSuite.overallStatus === 'fail' ? 'bg-red-500 text-white' :
                  'bg-white text-black'
                }`}>
                  {selectedSuite.overallStatus}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedSuite.tests.length === 0 && selectedSuite.overallStatus !== 'error' && (
                  <div className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest mt-8">RUN SUITE TO SEE RESULTS</div>
                )}
                {selectedSuite.tests.map(test => (
                  <div key={test.id} className="p-3 border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-3 mb-2">
                      {test.status === 'pass' && <CheckCircle size={14} strokeWidth={3} className="text-green-500" />}
                      {test.status === 'fail' && <XCircle size={14} strokeWidth={3} className="text-red-500" />}
                      {test.status === 'error' && <AlertCircle size={14} strokeWidth={3} className="text-yellow-500" />}
                      {test.status === 'running' && <span className="w-3 h-3 bg-yellow-400 border-[2px] border-black shrink-0" />}
                      <span className="text-xs font-black uppercase text-black flex-1 break-all">{test.name}</span>
                      {test.duration !== undefined && (
                        <span className="text-[10px] font-bold text-gray-500">{test.duration.toFixed(0)}MS</span>
                      )}
                    </div>
                    {test.error && (
                      <div className="mt-2 text-xs font-bold uppercase text-red-500 bg-red-50 p-2 border-[2px] border-red-500 break-all">
                        {test.error}
                      </div>
                    )}
                    {test.logs && test.logs.length > 0 && (
                      <div className="mt-3 space-y-1 bg-gray-100 p-2 border-[2px] border-black">
                        {test.logs.map((log, i) => (
                          <div key={i} className="text-[10px] font-mono font-bold text-black">{'>'} {log}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-black text-sm font-black uppercase tracking-widest">
          SELECT OR CREATE A TEST SUITE
        </div>
      )}
    </div>
  );
}
