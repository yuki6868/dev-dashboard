import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export default function TechStackChart({ techStack }) {
  const data = techStack?.items || [];

  if (data.length === 0) {
    return (
      <div className="card">
        <h2>技術構成グラフ</h2>
        <p>No data</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>技術構成グラフ</h2>

      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="lines_count"
              nameKey="language"
              outerRadius={90}
              label={(item) => `${item.language} ${item.percentage}%`}
            >
              {data.map((_, index) => (
                <Cell key={index} />
              ))}
            </Pie>

            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}