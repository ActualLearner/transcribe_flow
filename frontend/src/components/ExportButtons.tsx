interface ExportButtonsProps {
  transcriptionId: string;
  originalFilename: string;
}

export function ExportButtons({ transcriptionId, originalFilename }: ExportButtonsProps) {
  const baseName = originalFilename.replace(/\.[^.]+$/, "") || "transcript";
  return (
    <div className="flex gap-2">
      <a
        href={`/api/transcriptions/${transcriptionId}/export/?format=txt`}
        download={`${baseName}.txt`}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Download .txt
      </a>
      <a
        href={`/api/transcriptions/${transcriptionId}/export/?format=srt`}
        download={`${baseName}.srt`}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Download .srt
      </a>
    </div>
  );
}
