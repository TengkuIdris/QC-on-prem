import React from "react";
import "./Table.module.css";

interface TableProps {
  data: { [key: string]: string }[];
}

const Table: React.FC<TableProps> = ({ data }) => {
  if (data.length === 0) return <p>No data available</p>;

  const headers = Object.keys(data[0]);

  return (
    <table className="table">
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index}>
            {headers.map((header) => (
              <td key={header}>{row[header]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Table;
export type { TableProps };
