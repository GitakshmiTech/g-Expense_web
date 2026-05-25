import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const colors = ['#0f8bd7', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

export const CategoryBarChart = ({ data = [] }) => (
  <ResponsiveContainer width="100%" height={260}>
    <BarChart data={data.map((item) => ({ name: item._id || 'Unassigned', total: item.total }))}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#0f8bd7" />
    </BarChart>
  </ResponsiveContainer>
);

export const StatusPieChart = ({ data = [] }) => (
  <ResponsiveContainer width="100%" height={260}>
    <PieChart>
      <Pie data={data.map((item) => ({ name: item._id, value: item.total }))} innerRadius={58} outerRadius={92} dataKey="value">
        {data.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
      </Pie>
      <Tooltip />
    </PieChart>
  </ResponsiveContainer>
);

export const TrendLineChart = ({ data = [] }) => (
  <ResponsiveContainer width="100%" height={260}>
    <LineChart data={data.map((item, index) => ({ name: item._id || `P${index + 1}`, total: item.total }))}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);
