import api from "../services/api";

export default function OpenVSCodeButton({ projectId }) {
  async function handleOpen() {
    try {
      const res = await api.post(
        `/api/projects/${projectId}/open-vscode`
      );

      if (!res.data.success) {
        alert(res.data.error);
        return;
      }

      alert("VS Code opened");
    } catch (error) {
      console.error(error);
      alert("Failed to open VS Code");
    }
  }

  return (
    <button
      onClick={handleOpen}
      style={{
        padding: "10px 16px",
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
        marginBottom: "16px",
      }}
    >
      Open in VS Code
    </button>
  );
}