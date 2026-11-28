"use client";

import React, { useState } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

const weightFormat = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
});
const shortDate = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
});
const fullDate = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

function formatDate(value: string | number | undefined, formatter: Intl.DateTimeFormat) {
  if (value == null || value === '') return '';
  const numeric = Number(value);
  const timestamp = Number.isFinite(numeric) ? numeric : Date.parse(String(value));
  return Number.isFinite(timestamp) ? formatter.format(timestamp) : '';
}

const DAY_MS = 86_400_000;
const PERIODS = [30, 15, 7] as const;
type Period = (typeof PERIODS)[number];

// Calendar-day coordinates keep the axis evenly spaced, including days
// without weigh-ins, without shifting local dates at midnight.
function localDay(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;
}

function formatDay(value: string | number | undefined, formatter: Intl.DateTimeFormat) {
  if (value == null || value === '') return '';
  return formatDate(Math.round(Number(value)) * DAY_MS, formatter);
}

interface WeightChartProps {
  weightLogs: Array<{ date: string; weight: number }>;
  startWeight?: number;
  targetWeight?: number;
  currentWeight?: number;
}

export default function WeightChart({ 
  weightLogs,
  startWeight,
  targetWeight,
  currentWeight
}: WeightChartProps) {
  const [period, setPeriod] = useState<Period>(7);
  // Se não houver logs, não renderiza o gráfico
  if (!weightLogs || weightLogs.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="text-center">
          <h3 className="font-semibold text-slate-800 mb-2">Progresso de Peso</h3>
          <p className="text-sm text-slate-400">
            Nenhum registro de peso encontrado.
          </p>
          <button className="mt-3 text-xs text-[#007BFF] font-medium hover:underline">
            + Adicionar primeiro registro
          </button>
        </div>
      </div>
    );
  }

  // Usa os dados reais do usuário
  const data = weightLogs;
  const today = localDay(Date.now());
  const firstDay = today - period + 1;
  const dailyWeights = new Map<number, { x: number; y: number }>();
  // Show the latest real measurement of each calendar day. No fabricated
  // weights for missing days; the original history remains untouched.
  data
    .map(({ date, weight }) => ({ timestamp: new Date(date).getTime(), weight }))
    .filter(({ timestamp, weight }) => Number.isFinite(timestamp) && Number.isFinite(weight))
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach(({ timestamp, weight }) => {
      const day = localDay(timestamp);
      if (day >= firstDay && day <= today) {
        dailyWeights.set(day, { x: day, y: weight });
      }
    });
  const points = Array.from(dailyWeights.values());
  const options: ApexOptions = {
    chart: {
      type: 'area',
      parentHeightOffset: 0,
      foreColor: '#94a3b8',
      fontFamily: 'inherit',
      toolbar: {
        show: points.length > 0,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false,
        },
        export: {
          csv: {
            filename: 'historico-de-peso',
            headerCategory: 'Data',
            headerValue: 'Peso (kg)',
            categoryFormatter: (value) => formatDay(value, shortDate),
          },
          svg: { filename: 'progresso-de-peso' },
          png: { filename: 'progresso-de-peso' },
        },
      },
      zoom: { enabled: false },
      animations: { enabled: false },
    },
    colors: ['#007BFF'],
    stroke: { curve: 'smooth', width: 2, lineCap: 'round' },
    fill: {
      type: 'gradient',
      gradient: {
        type: 'vertical',
        shadeIntensity: 0,
        gradientToColors: ['#007BFF'],
        opacityFrom: 0.3,
        opacityTo: 0,
        stops: [5, 95, 100],
      },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    markers: {
      size: points.length === 1 ? 4 : 0,
      strokeWidth: 2,
      strokeColors: '#fff',
      hover: { size: 5 },
    },
    grid: {
      borderColor: '#f1f5f9',
      strokeDashArray: 3,
      padding: { top: 12, left: 0, right: 8 },
    },
    xaxis: {
      type: 'numeric',
      min: firstDay,
      max: today,
      // Seven daily labels, or about six spaced labels on longer periods.
      tickAmount: period === 7 ? 6 : 5,
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      labels: {
        showDuplicates: false,
        hideOverlappingLabels: true,
        rotate: 0,
        style: { fontSize: '10px', colors: '#94a3b8' },
        formatter: (value) => formatDay(value, shortDate),
      },
    },
    yaxis: {
      tickAmount: 3,
      min: (value) => Math.max(0, Math.floor(value - 2)),
      max: (value) => Math.ceil(value + 2),
      labels: {
        style: { fontSize: '10px', colors: '#94a3b8' },
        formatter: (value) => weightFormat.format(value) + ' kg',
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: { formatter: (value) => formatDay(value, fullDate) },
      y: { formatter: (value) => weightFormat.format(value) + ' kg' },
    },
    noData: { text: 'Nenhum registro neste período.' },
  };
  const firstWeight = startWeight || data[0]?.weight || 0;
  const lastWeight = currentWeight || data[data.length - 1]?.weight || 0;
  const goalWeight = targetWeight || 0;
  const weightLoss = (firstWeight - lastWeight).toFixed(1);
  const progress = goalWeight ? ((firstWeight - lastWeight) / (firstWeight - goalWeight) * 100).toFixed(0) : null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold text-slate-800">Progresso de Peso</h3>
          {progress && (
            <p className="text-xs text-slate-400 mt-0.5">
              {progress}% da meta atingida
            </p>
          )}
        </div>
        <span className="text-xs text-[#28A745] font-medium bg-[#28A745]/10 px-2 py-1 rounded-full">
          -{weightLoss}kg
        </span>
      </div>
      
      <div className="relative h-52 min-w-0">
        <div className="absolute left-0 top-0 z-10 flex items-center gap-1" role="group" aria-label="Período do gráfico de peso">
          {PERIODS.map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={period === days}
              onClick={() => setPeriod(days)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007BFF] ${
                period === days
                  ? 'bg-[#007BFF]/10 text-[#007BFF]'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {days}D
            </button>
          ))}
        </div>
        <Chart
          key={period}
          type="area"
          width="100%"
          height="100%"
          options={options}
          series={[{ name: 'Peso', data: points }]}
        />
      </div>

      <div className="flex justify-between mt-3 pt-3 border-t border-slate-100 text-sm">
        <div className="text-center flex-1">
          <span className="text-xs text-slate-400">Início</span>
          <p className="font-semibold text-slate-700">{firstWeight} kg</p>
        </div>
        <div className="text-center flex-1">
          <span className="text-xs text-slate-400">Atual</span>
          <p className="font-semibold text-[#28A745]">{lastWeight} kg</p>
        </div>
        {goalWeight > 0 && (
          <div className="text-center flex-1">
            <span className="text-xs text-slate-400">Meta</span>
            <p className="font-semibold text-[#007BFF]">{goalWeight} kg</p>
          </div>
        )}
      </div>
    </div>
  );
}