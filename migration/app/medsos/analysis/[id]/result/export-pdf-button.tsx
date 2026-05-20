"use client";

export default function ExportPdfButton() {
  return (
    <button
      type="button"
      className="secondary no-print"
      onClick={() => {
        window.print();
      }}
    >
      Export PDF
    </button>
  );
}