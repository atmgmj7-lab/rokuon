"use client";

import { useCallback, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import type { ScriptNode, ScriptFlowData } from "@/src/types/script";

interface VisualScriptEditorProps {
  flowData: ScriptFlowData;
  onSave: (flowData: ScriptFlowData) => void;
}

export default function VisualScriptEditor({
  flowData,
  onSave,
}: VisualScriptEditorProps) {
  // FlowDataからReactFlowのノードとエッジに変換
  const convertToReactFlowNodes = (scriptNodes: ScriptNode[]): Node[] => {
    return scriptNodes.map((node, index) => ({
      id: node.id,
      type: node.type === "end" ? "output" : node.type === "start" ? "input" : "default",
      position: node.position || { x: 250, y: index * 150 },
      data: {
        label: (
          <div className="px-2 py-1">
            <div className="font-bold text-sm mb-1">
              {node.type === "start" && "🚀"}
              {node.type === "message" && "💬"}
              {node.type === "question" && "❓"}
              {node.type === "end" && "✅"}
              {" " + node.type.toUpperCase()}
            </div>
            <div className="text-xs max-w-[200px] overflow-hidden text-ellipsis">
              {node.content.substring(0, 50)}...
            </div>
            {node.hypothesis_tags && (
              <div className="text-xs mt-1 text-purple-600">
                🏷️ 属性タグあり
              </div>
            )}
          </div>
        ),
      },
      style: {
        background: 
          node.type === "start" ? "#dcfce7" :
          node.type === "end" ? "#fce7f3" :
          node.type === "question" ? "#dbeafe" : "#fff",
        border: "2px solid #333",
        borderRadius: "8px",
        padding: "10px",
        width: 220,
      },
    }));
  };

  const convertToReactFlowEdges = (scriptNodes: ScriptNode[]): Edge[] => {
    const edges: Edge[] = [];
    scriptNodes.forEach((node) => {
      if (node.options) {
        node.options.forEach((option, index) => {
          edges.push({
            id: `${node.id}-${option.nextNodeId}`,
            source: node.id,
            target: option.nextNodeId,
            label: option.label,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#4f46e5", strokeWidth: 2 },
            labelStyle: { fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "#fff", fillOpacity: 0.9 },
          });
        });
      }
    });
    return edges;
  };

  const [nodes, setNodes, onNodesChange] = useNodesState(
    convertToReactFlowNodes(flowData.nodes)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    convertToReactFlowEdges(flowData.nodes)
  );
  const [selectedNode, setSelectedNode] = useState<ScriptNode | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // ノード選択時
  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      const scriptNode = flowData.nodes.find((n) => n.id === node.id);
      if (scriptNode) {
        setSelectedNode(scriptNode);
      }
    },
    [flowData.nodes]
  );

  // 保存ボタン
  const handleSave = () => {
    // ReactFlowの位置情報をScriptNodeに反映
    const updatedNodes = flowData.nodes.map((node) => {
      const reactFlowNode = nodes.find((n) => n.id === node.id);
      if (reactFlowNode) {
        return {
          ...node,
          position: reactFlowNode.position,
        };
      }
      return node;
    });

    const updatedFlowData: ScriptFlowData = {
      ...flowData,
      nodes: updatedNodes,
    };

    onSave(updatedFlowData);
    alert("✅ スクリプトを保存しました！");
  };

  return (
    <div className="h-screen flex">
      {/* メインエディタ */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <Controls />
          <MiniMap />
        </ReactFlow>

        {/* 保存ボタン */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg transition-colors"
          >
            💾 保存
          </button>
        </div>
      </div>

      {/* サイドパネル（ノード詳細） */}
      {selectedNode && (
        <div className="w-96 bg-white border-l border-gray-200 p-6 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4 text-gray-800">
            ノード詳細
          </h2>

          <div className="space-y-4">
            {/* ノードタイプ */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                タイプ
              </label>
              <div className="px-3 py-2 bg-gray-100 rounded">
                {selectedNode.type === "start" && "🚀 開始ノード"}
                {selectedNode.type === "message" && "💬 メッセージ"}
                {selectedNode.type === "question" && "❓ 質問"}
                {selectedNode.type === "end" && "✅ 終了"}
              </div>
            </div>

            {/* コンテンツ */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                コンテンツ
              </label>
              <textarea
                value={selectedNode.content}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                rows={6}
              />
            </div>

            {/* 仮説タグ（開始ノードの場合） */}
            {selectedNode.hypothesis_tags && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🏷️ 属性フィルター
                </label>
                <div className="space-y-2 text-sm">
                  {selectedNode.hypothesis_tags.hp && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Web状況:</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {selectedNode.hypothesis_tags.hp}
                      </span>
                    </div>
                  )}
                  {selectedNode.hypothesis_tags.hiring && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">求人状況:</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                        {selectedNode.hypothesis_tags.hiring}
                      </span>
                    </div>
                  )}
                  {selectedNode.hypothesis_tags.target && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">ターゲット:</span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                        {selectedNode.hypothesis_tags.target}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 選択肢 */}
            {selectedNode.options && selectedNode.options.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  選択肢
                </label>
                <div className="space-y-2">
                  {selectedNode.options.map((option) => (
                    <div
                      key={option.id}
                      className="p-3 bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        → {option.nextNodeId}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
