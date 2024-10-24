import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { $alerts, $hubVersion, $systems, pb } from '@/lib/stores'
import { useStore } from '@nanostores/react'
import { GithubIcon } from 'lucide-react'
import { Separator } from '../ui/separator'
import { alertInfo, updateRecordList, updateSystemList } from '@/lib/utils'
import { AlertRecord, SystemRecord } from '@/types'
import { Input } from '../ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Link } from '../router'

const SystemsTable = lazy(() => import('../systems-table/systems-table'))

export default function () {
	const hubVersion = useStore($hubVersion)
	const [filter, setFilter] = useState<string>()
	const alerts = useStore($alerts)
	const systems = useStore($systems)

	// todo: maybe remove active alert if changed
	const activeAlerts = useMemo(() => {
		const activeAlerts = alerts.filter((alert) => {
			const active = alert.triggered && alert.name in alertInfo
			if (!active) {
				return false
			}
			alert.sysname = systems.find((system) => system.id === alert.system)?.name
			return true
		})
		return activeAlerts
	}, [alerts])

	useEffect(() => {
		document.title = 'Dashboard / Beszel'

		// make sure we have the latest list of systems
		updateSystemList()

		// subscribe to real time updates for systems / alerts
		pb.collection<SystemRecord>('systems').subscribe('*', (e) => {
			updateRecordList(e, $systems)
		})
		// todo: add toast if new triggered alert comes in
		pb.collection<AlertRecord>('alerts').subscribe('*', (e) => {
			updateRecordList(e, $alerts)
		})
		return () => {
			pb.collection('systems').unsubscribe('*')
			// pb.collection('alerts').unsubscribe('*')
		}
	}, [])

	return (
		<>
			{/* show active alerts */}
			{activeAlerts.length > 0 && (
				<Card className="mb-4">
					<CardHeader className="pb-4 px-2 sm:px-6 max-sm:pt-5 max-sm:pb-1">
						<div className="px-2 sm:px-1">
							<CardTitle>Active Alerts</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="max-sm:p-2">
						{activeAlerts.length > 0 && (
							<div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
								{activeAlerts.map((alert) => {
									const info = alertInfo[alert.name as keyof typeof alertInfo]
									return (
										<Alert
											key={alert.id}
											className="hover:-translate-y-[1px] duration-200 bg-transparent border-foreground/10  hover:shadow-md shadow-black"
										>
											<info.icon className="h-4 w-4" />
											<AlertTitle>
												{alert.sysname} {info.name}
											</AlertTitle>
											<AlertDescription>
												Exceeds {alert.value}
												{info.unit} average in last {alert.min} min
											</AlertDescription>
											<Link
												href={`/system/${encodeURIComponent(alert.sysname!)}`}
												className="absolute inset-0 w-full h-full"
												aria-label="View system"
											></Link>
										</Alert>
									)
								})}
							</div>
						)}
					</CardContent>
				</Card>
			)}
			<Card>
				<CardHeader className="pb-5 px-2 sm:px-6 max-sm:pt-5 max-sm:pb-1">
					<div className="grid md:flex gap-3 w-full items-end">
						<div className="px-2 sm:px-1">
							<CardTitle className="mb-2.5">All Systems</CardTitle>
							<CardDescription>
								Updated in real time. Press{' '}
								<kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
									<span className="text-xs">⌘</span>K
								</kbd>{' '}
								to open the command palette.
							</CardDescription>
						</div>
						<Input
							placeholder="Filter..."
							onChange={(e) => setFilter(e.target.value)}
							className="w-full md:w-56 lg:w-80 ml-auto px-4"
						/>
					</div>
				</CardHeader>
				<CardContent className="max-sm:p-2">
					<Suspense>
						<SystemsTable filter={filter} />
					</Suspense>
				</CardContent>
			</Card>

			{hubVersion && (
				<div className="flex gap-1.5 justify-end items-center pr-3 sm:pr-6 mt-3.5 text-xs opacity-80">
					<a
						href="https://github.com/henrygd/beszel"
						target="_blank"
						className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground duration-75"
					>
						<GithubIcon className="h-3 w-3" /> GitHub
					</a>
					<Separator orientation="vertical" className="h-2.5 bg-muted-foreground opacity-70" />
					<a
						href="https://github.com/henrygd/beszel/releases"
						target="_blank"
						className="text-muted-foreground hover:text-foreground duration-75"
					>
						Beszel {hubVersion}
					</a>
				</div>
			)}
		</>
	)
}
