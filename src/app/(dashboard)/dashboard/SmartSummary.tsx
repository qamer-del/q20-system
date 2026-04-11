"use client"

import { useEffect, useRef, useState } from "react"
import {
    CircleDollarSign, Banknote, Landmark, Droplets,
    Gauge, DatabaseZap, Lightbulb, TrendingUp, TrendingDown, AlertCircle
} from "lucide-react"

// ─── Animated Counter ───────────────────────────────────────────────────────
function AnimatedCounter({ target, prefix = "", suffix = "", decimals = 0 }: {
    target: number
    prefix?: string
    suffix?: string
    decimals?: number
}) {
    const [value, setValue] = useState(0)
    const rafRef = useRef<number | null>(null)

    useEffect(() => {
        const duration = 1400
        const start = performance.now()

        const animate = (now: number) => {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3)
            setValue(parseFloat((eased * target).toFixed(decimals)))
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate)
            } else {
                setValue(target)
            }
        }

        rafRef.current = requestAnimationFrame(animate)
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    }, [target, decimals])

    return (
        <span>
            {prefix}{decimals > 0
                ? value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
                : Math.round(value).toLocaleString()}
            {suffix}
        </span>
    )
}

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KPICard({
    title, value, prefix = "", suffix = "", decimals = 0,
    icon: Icon, gradient, iconBg, iconColor
}: {
    title: string
    value: number
    prefix?: string
    suffix?: string
    decimals?: number
    icon: React.ElementType
    gradient: string
    iconBg: string
    iconColor: string
}) {
    return (
        <div className={`relative overflow-hidden rounded-2xl p-6 ${gradient} border border-white/20 shadow-lg backdrop-blur-sm group hover:scale-[1.02] transition-all duration-300`}>
            {/* Decorative glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-30 bg-white" />
            </div>

            <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${iconBg}`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">{title}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                <AnimatedCounter target={value} prefix={prefix} suffix={suffix} decimals={decimals} />
            </p>
        </div>
    )
}

// ─── Insight Item ────────────────────────────────────────────────────────────
function InsightItem({ icon: Icon, text, color }: {
    icon: React.ElementType
    text: string
    color: string
}) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
            <div className={`mt-0.5 p-1.5 rounded-lg ${color} shrink-0`}>
                <Icon className="w-3.5 h-3.5" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug">{text}</p>
        </div>
    )
}

// ─── SmartSummary ────────────────────────────────────────────────────────────
export interface SmartSummaryProps {
    todaySalesAmount: number
    todayCash: number
    todayBank: number
    todayLiters: number
    activePumps: number
    totalFuelStock: number
    insights: string[]
    dict: any
}

export default function SmartSummary({
    todaySalesAmount,
    todayCash,
    todayBank,
    todayLiters,
    activePumps,
    totalFuelStock,
    insights,
    dict
}: SmartSummaryProps) {
    const d = dict.Dashboard

    const cards = [
        {
            title: d.today_sales,
            value: todaySalesAmount,
            prefix: "SAR ",
            decimals: 2,
            icon: CircleDollarSign,
            gradient: "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40",
            iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
            iconColor: "text-emerald-600 dark:text-emerald-400"
        },
        {
            title: d.today_cash,
            value: todayCash,
            prefix: "SAR ",
            decimals: 2,
            icon: Banknote,
            gradient: "bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/40 dark:to-lime-950/40",
            iconBg: "bg-green-100 dark:bg-green-900/40",
            iconColor: "text-green-600 dark:text-green-400"
        },
        {
            title: d.today_bank,
            value: todayBank,
            prefix: "SAR ",
            decimals: 2,
            icon: Landmark,
            gradient: "bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40",
            iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
            iconColor: "text-indigo-600 dark:text-indigo-400"
        },
        {
            title: d.today_liters,
            value: todayLiters,
            suffix: " L",
            decimals: 0,
            icon: Droplets,
            gradient: "bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/40 dark:to-sky-950/40",
            iconBg: "bg-cyan-100 dark:bg-cyan-900/40",
            iconColor: "text-cyan-600 dark:text-cyan-400"
        },
        {
            title: d.active_pumps,
            value: activePumps,
            decimals: 0,
            icon: Gauge,
            gradient: "bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40",
            iconBg: "bg-violet-100 dark:bg-violet-900/40",
            iconColor: "text-violet-600 dark:text-violet-400"
        },
        {
            title: d.current_stock,
            value: totalFuelStock,
            suffix: " L",
            decimals: 0,
            icon: DatabaseZap,
            gradient: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40",
            iconBg: "bg-amber-100 dark:bg-amber-900/40",
            iconColor: "text-amber-600 dark:text-amber-400"
        }
    ]

    return (
        <section className="space-y-6">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <span className="inline-block w-2 h-6 bg-gradient-to-b from-emerald-400 to-cyan-400 rounded-full" />
                        {d.smart_summary_title}
                    </h2>
                    <p className="text-sm text-slate-400 mt-1 ml-4">{d.smart_summary_subtitle}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 px-3 py-1.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Live
                </span>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {cards.map((card) => (
                    <KPICard key={card.title} {...card} />
                ))}
            </div>

            {/* Smart Insights Panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-black uppercase tracking-widest text-slate-500">{d.smart_insights}</span>
                </div>
                <div className="px-6 py-2">
                    {insights.length === 0 ? (
                        <p className="py-4 text-sm text-slate-400 italic">{d.insight_no_data}</p>
                    ) : (
                        insights.map((text, i) => {
                            const isPositive = text.includes("▲") || text.includes("highest") || text.includes("الأعلى")
                            const isAlert = text.includes("⚠") || text.includes("variance") || text.includes("فرق")
                            const Icon = isAlert ? AlertCircle : isPositive ? TrendingUp : TrendingDown
                            const color = isAlert
                                ? "bg-rose-100 dark:bg-rose-900/30 text-rose-500"
                                : isPositive
                                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500"
                                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-500"
                            return <InsightItem key={i} icon={Icon} text={text} color={color} />
                        })
                    )}
                </div>
            </div>
        </section>
    )
}
