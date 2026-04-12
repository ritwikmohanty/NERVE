"use client";

import { motion } from "framer-motion";
import { ReactFlow, Background, Controls } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Copy } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-screen p-6 space-y-6">
      <header className="flex justify-between items-center pb-4 border-b border-dark-card">
        <h1 className="text-3xl font-heading font-bold text-green-light">NERVE Dashboard</h1>
        <div className="font-mono text-sm bg-dark-card px-4 py-2 rounded-md flex items-center gap-2 border border-green-deep/30">
          <span className="text-green-accent">Node Status:</span>
          <span>Active</span>
          <Copy className="w-4 h-4 ml-2 text-ink" />
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.aside 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-1 bg-dark-card rounded-lg p-4 border border-green-deep/20 flex flex-col gap-4"
        >
          <h2 className="font-heading text-xl text-cream">Controls</h2>
          <div className="bg-ink p-4 rounded-md space-y-2 border border-dark-card font-mono text-sm">
            <p className="text-green-light">System is fully operational.</p>
            <p className="text-cream/70">Awaiting inputs...</p>
          </div>
        </motion.aside>

        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="col-span-1 md:col-span-3 bg-dark-card rounded-lg border border-green-deep/20 overflow-hidden relative"
        >
          <ReactFlow 
            nodes={[{ id: '1', position: { x: 250, y: 150 }, data: { label: 'NERVE Core' } }]}
            edges={[]}
            fitView
            colorMode="dark"
          >
            <Background gap={12} size={1} />
            <Controls />
          </ReactFlow>
        </motion.section>
      </main>
    </div>
  );
}
