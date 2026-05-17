import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function TodoTypeChart({ todos }) {
  const counts = {};

  todos.forEach((todo) => {
    const type = todo.todo_type || "Other";
    counts[type] = (counts[type] || 0) + 1;
  });

  const data = Object.entries(counts).map(([type, count]) => ({
    type,
    count,
  }));

  if (data.length === 0) {
    return (
      <div className="card">
        <h2>TODO種別グラフ</h2>
        <p>No data</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>TODO種別グラフ</h2>

      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="type" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}