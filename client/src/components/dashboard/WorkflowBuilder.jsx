import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const Node = ({ node }) => {
  const [{ isDragging }, drag] = useDrag(() => ({ type: 'workflow-node', item: node, collect: (monitor) => ({ isDragging: monitor.isDragging() }) }));
  return (
    <div ref={drag} className={`absolute rounded-md border bg-white px-4 py-3 text-sm font-semibold shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white ${isDragging ? 'opacity-60' : ''}`} style={{ left: node.position?.x || 0, top: node.position?.y || 0 }}>
      {node.label}
    </div>
  );
};

const Canvas = ({ nodes }) => {
  const [, drop] = useDrop(() => ({ accept: 'workflow-node', drop: () => ({}) }));
  return (
    <div ref={drop} className="relative h-80 overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
      {nodes.map((node) => <Node key={node.id} node={node} />)}
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <line x1="210" y1="78" x2="340" y2="42" stroke="#94a3b8" strokeWidth="2" />
        <line x1="470" y1="42" x2="600" y2="42" stroke="#94a3b8" strokeWidth="2" />
        <line x1="730" y1="42" x2="860" y2="42" stroke="#94a3b8" strokeWidth="2" />
      </svg>
    </div>
  );
};

export const WorkflowBuilder = ({ workflow }) => {
  const nodes = workflow?.nodes?.length ? workflow.nodes : [
    { id: 'condition', label: 'IF Amount > 5000', position: { x: 40, y: 60 } },
    { id: 'manager', label: 'Manager Approval', position: { x: 340, y: 20 } },
    { id: 'finance', label: 'Finance Approval', position: { x: 600, y: 20 } },
    { id: 'cfo', label: 'CFO Approval', position: { x: 860, y: 20 } }
  ];
  return (
    <DndProvider backend={HTML5Backend}>
      <Canvas nodes={nodes} />
    </DndProvider>
  );
};
