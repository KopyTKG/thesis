import { createCanvas } from "canvas";
import { Chart, registerables } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
// Register Chart.js components
Chart.register(...registerables, annotationPlugin);

// Load data json
import data from "./benchmark_data.json";

type tBenchmark = {
  theoretical_limits: {
    description: string;
    per_ssd: {
      sequential_read_MBps: number;
      sequential_write_MBps: number;
      interface: string;
    };
    aggregate_storage: {
      total_ssds: number;
      sequential_read_MBps: number;
      sequential_write_MBps: number;
      note: string;
    };
    network_per_link: {
      bandwidth_Gbps: number;
      throughput_MBps: number;
      note: string;
    };
    network_aggregate_oss: {
      links: number;
      throughput_MBps: number;
      note: string;
    };
    bottleneck: string;
  };
  benchmarks: tFilesystem[];
  summary_for_plotting: {
    description: string;
    unit: string;
    data: {
      label: string;
      write: number;
      read: number;
    }[];
  };
};

type tFilesystem = {
  filesystem: string;
  version: string;
  config: string;
  os: string;
  transport: string;
  redundancy: string;
  storage: string;
  benchmark_tool: string;
  deprecated_reason?: string;
  aggregate_write_MBps: number;
  aggregate_read_MBps: number;
  per_node?: any;
  per_node_note?: any;
  per_node_estimate?: any;
  per_node_avg?: any;
  per_node_range?: any;
};

const plotData = data as tBenchmark;

async function createPerformanceChart(title: string, filesystems: string[], speeds: number[], hardwareLimit: number, outputPath: string) {
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext("2d");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: filesystems,
      datasets: [
        {
          label: "Measured Throughput",
          data: speeds,
          backgroundColor: "rgba(54, 162, 235, 0.8)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 16 },
        },
        legend: {
          display: true,
          position: "top",
        },
        annotation: {
          annotations: {
            line1: {
              type: "line",
              yMin: hardwareLimit,
              yMax: hardwareLimit,
              borderColor: "rgba(255, 99, 132, 0.8)",
              borderWidth: 2,
              borderDash: [10, 5],
              label: {
                display: true,
                content: `Theoretical HW Max - ${hardwareLimit} MB/s`,
                position: "end",
              },
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Speed (MB/s)",
          },
          max: Math.max(hardwareLimit, Math.max(...speeds)) * 1.1,
        },
        x: {
          title: {
            display: true,
            text: "Distributed File System Type",
          },
        },
      },
    },
    plugins: [
      {
        id: "valueLabels",
        afterDatasetsDraw(chart) {
          const ctx = chart.ctx;
          chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((bar, index) => {
              const data = dataset.data[index] as number;
              ctx.fillStyle = "black";
              ctx.font = "bold 12px Arial";
              ctx.textAlign = "center";
              ctx.fillText(data.toString(), bar.x, bar.y - 5);
            });
          });
        },
      },
    ],
  });

  const buffer = canvas.toBuffer("image/png");
  await Bun.write(outputPath, buffer);
  console.log(`Chart saved to ${outputPath}`);
}

const fsNames = plotData.summary_for_plotting.data.map((fs) => fs.label);
const fsRead = plotData.summary_for_plotting.data.map((fs) => fs.read);
const fsWrite = plotData.summary_for_plotting.data.map((fs) => fs.write);
const th_rmax = plotData.theoretical_limits.aggregate_storage.sequential_read_MBps;
const th_wmax = plotData.theoretical_limits.aggregate_storage.sequential_write_MBps;
// Create Read Performance Chart
await createPerformanceChart("Naměřené rychlosti čtení (MB/s)", fsNames, fsRead, th_rmax, "read_performance.png");

// Create Write Performance Chart
await createPerformanceChart("Naměřené rychlosti zápisu (MB/s)", fsNames, fsWrite, th_wmax, "write_performance.png");

