import { createFileRoute } from "@tanstack/react-router";
import { FilesPage } from "@/features/files";

export const Route = createFileRoute("/files")({
  component: FilesPage,
});
