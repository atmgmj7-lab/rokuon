import { getScriptById } from "@/src/actions/script-actions";
import LiveAssistant from "@/src/components/script/LiveAssistant";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ScriptLivePage({ params }: PageProps) {
  const { id } = await params;
  const script = await getScriptById(id);

  if (!script) {
    notFound();
  }

  return (
    <div>
      <div className="absolute top-4 right-4 z-10">
        <Link
          href="/scripts"
          className="px-4 py-2 bg-white hover:bg-gray-100 rounded-lg shadow-md font-medium transition-colors"
        >
          ← スクリプト一覧
        </Link>
      </div>
      <LiveAssistant
        flowData={script.flowData}
        scriptTitle={script.title}
        scriptId={script.id}
      />
    </div>
  );
}
