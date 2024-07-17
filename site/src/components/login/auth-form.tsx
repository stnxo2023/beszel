import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoaderCircle, LockIcon, LogInIcon, MailIcon, UserIcon } from 'lucide-react'
import { $authenticated, pb } from '@/lib/stores'
import * as v from 'valibot'
import { toast } from '../ui/use-toast'
import {
	Dialog,
	DialogContent,
	DialogTrigger,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { useEffect, useState } from 'react'
import { AuthProviderInfo } from 'pocketbase'
import { Link } from '../router'

const honeypot = v.literal('')
const emailSchema = v.pipe(v.string(), v.email('Invalid email address.'))
const passwordSchema = v.pipe(
	v.string(),
	v.minLength(10, 'Password must be at least 10 characters.')
)

const LoginSchema = v.looseObject({
	name: honeypot,
	email: emailSchema,
	password: passwordSchema,
})

const RegisterSchema = v.looseObject({
	name: honeypot,
	username: v.pipe(
		v.string(),
		v.regex(
			/^(?=.*[a-zA-Z])[a-zA-Z0-9_-]+$/,
			'Invalid username. You may use alphanumeric characters, underscores, and hyphens.'
		),
		v.minLength(3, 'Username must be at least 3 characters long.')
	),
	email: emailSchema,
	password: passwordSchema,
	passwordConfirm: passwordSchema,
})

const showLoginFaliedToast = () => {
	toast({
		title: 'Login attempt failed',
		description: 'Please check your credentials and try again',
		variant: 'destructive',
	})
}

export function UserAuthForm({
	className,
	isFirstRun,
	...props
}: {
	className?: string
	isFirstRun: boolean
}) {
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [isGitHubLoading, setIsOauthLoading] = useState<boolean>(false)
	const [errors, setErrors] = useState<Record<string, string | undefined>>({})
	const [authProviders, setAuthProviders] = useState<AuthProviderInfo[]>([])

	useEffect(() => {
		pb.collection('users')
			.listAuthMethods()
			.then((methods) => {
				console.log('methods', methods)
				console.log('password active', methods.emailPassword)
				setAuthProviders(methods.authProviders)
				console.log('auth providers', authProviders)
			})
	}, [])

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		setIsLoading(true)
		try {
			const formData = new FormData(e.target as HTMLFormElement)
			const data = Object.fromEntries(formData) as Record<string, any>
			const Schema = isFirstRun ? RegisterSchema : LoginSchema
			const result = v.safeParse(Schema, data)
			if (!result.success) {
				console.log(result)
				let errors = {}
				for (const issue of result.issues) {
					// @ts-ignore
					errors[issue.path[0].key] = issue.message
				}
				setErrors(errors)
				return
			}
			const { email, password, passwordConfirm, username } = result.output
			if (isFirstRun) {
				// check that passwords match
				if (password !== passwordConfirm) {
					let msg = 'Passwords do not match'
					setErrors({ passwordConfirm: msg })
					return
				}
				await pb.admins.create({
					email,
					password,
					passwordConfirm: password,
				})
				await pb.admins.authWithPassword(email, password)
				await pb.collection('users').create({
					username,
					email,
					password,
					passwordConfirm: password,
					role: 'admin',
					verified: true,
				})
				await pb.collection('users').authWithPassword(email, password)
			} else {
				await pb.collection('users').authWithPassword(email, password)
			}
			$authenticated.set(true)
		} catch (e) {
			showLoginFaliedToast()
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className={cn('grid gap-6', className)} {...props}>
			<form onSubmit={handleSubmit} onChange={() => setErrors({})}>
				<div className="grid gap-2.5">
					{isFirstRun && (
						<div className="grid gap-1 relative">
							<UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
							<Label className="sr-only" htmlFor="username">
								Username
							</Label>
							<Input
								autoFocus={true}
								id="username"
								name="username"
								required
								placeholder="username"
								type="username"
								autoCapitalize="none"
								autoComplete="username"
								autoCorrect="off"
								disabled={isLoading || isGitHubLoading}
								className="pl-9"
							/>
							{errors?.username && <p className="px-1 text-xs text-red-600">{errors.username}</p>}
						</div>
					)}
					<div className="grid gap-1 relative">
						<MailIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
						<Label className="sr-only" htmlFor="email">
							Email
						</Label>
						<Input
							id="email"
							name="email"
							required
							placeholder={isFirstRun ? 'email' : 'name@example.com'}
							type="email"
							autoCapitalize="none"
							autoComplete="email"
							autoCorrect="off"
							disabled={isLoading || isGitHubLoading}
							className="pl-9"
						/>
						{errors?.email && <p className="px-1 text-xs text-red-600">{errors.email}</p>}
					</div>
					<div className="grid gap-1 relative">
						<LockIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
						<Label className="sr-only" htmlFor="pass">
							Password
						</Label>
						<Input
							id="pass"
							name="password"
							placeholder="password"
							required
							type="password"
							autoComplete="current-password"
							disabled={isLoading || isGitHubLoading}
							className="pl-9"
						/>
						{errors?.password && <p className="px-1 text-xs text-red-600">{errors.password}</p>}
					</div>
					{isFirstRun && (
						<div className="grid gap-1 relative">
							<LockIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
							<Label className="sr-only" htmlFor="pass2">
								Confirm password
							</Label>
							<Input
								id="pass2"
								name="passwordConfirm"
								placeholder="confirm password"
								required
								type="password"
								autoComplete="current-password"
								disabled={isLoading || isGitHubLoading}
								className="pl-9"
							/>
							{errors?.passwordConfirm && (
								<p className="px-1 text-xs text-red-600">{errors.passwordConfirm}</p>
							)}
						</div>
					)}
					<div className="sr-only">
						{/* honeypot */}
						<label htmlFor="name"></label>
						<input id="name" type="text" name="name" tabIndex={-1} />
					</div>
					<button className={cn(buttonVariants())} disabled={isLoading}>
						{isLoading ? (
							<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<LogInIcon className="mr-2 h-4 w-4" />
						)}
						{isFirstRun ? 'Create account' : 'Sign in'}
					</button>
				</div>
			</form>
			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<span className="w-full border-t" />
				</div>
				<div className="relative flex justify-center text-xs uppercase">
					<span className="bg-background px-2 text-muted-foreground">Or continue with</span>
				</div>
			</div>

			{authProviders.length > 0 && (
				<div className="grid gap-2">
					{authProviders.map((provider) => (
						<button
							key={provider.name}
							type="button"
							className={cn(buttonVariants({ variant: 'outline' }))}
							onClick={async () => {
								setIsOauthLoading(true)
								try {
									await pb.collection('users').authWithOAuth2({ provider: provider.name })
									$authenticated.set(pb.authStore.isValid)
								} catch (e) {
									showLoginFaliedToast()
								} finally {
									setIsOauthLoading(false)
								}
							}}
							disabled={isLoading || isGitHubLoading}
						>
							{isGitHubLoading ? (
								<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<img
									className="mr-2 h-4 w-4 dark:invert"
									src={`/icons/${provider.name}.svg`}
									alt=""
									onError={(e) => {
										e.currentTarget.src = '/icons/lock.svg'
									}}
								/>
							)}
							<span className="translate-y-[1px]">{provider.displayName}</span>
						</button>
					))}
				</div>
			)}

			{!authProviders.length && (
				<Dialog>
					<DialogTrigger asChild>
						<button type="button" className={cn(buttonVariants({ variant: 'outline' }))}>
							<img className="mr-2 h-4 w-4 dark:invert" src="/icons/github.svg" alt="" />
							<span className="translate-y-[1px]">GitHub</span>
						</button>
					</DialogTrigger>
					<DialogContent style={{ maxWidth: 440, width: '90%' }}>
						<DialogHeader>
							<DialogTitle>OAuth 2 / OIDC support</DialogTitle>
						</DialogHeader>
						<div className="text-primary/70 text-[0.95em] contents">
							<p>Beszel supports OpenID Connect and many OAuth2 authentication providers.</p>
							<p>
								Please view the{' '}
								<a
									href="https://github.com/henrygd/beszel/blob/main/readme.md#oauth--oidc-integration"
									className={cn(buttonVariants({ variant: 'link' }), 'p-0 h-auto')}
								>
									GitHub README
								</a>{' '}
								for instructions.
							</p>
						</div>
					</DialogContent>
				</Dialog>
			)}
			<Link
				href="/forgot-password"
				className="text-sm mx-auto mt-2 hover:text-brand underline underline-offset-4 opacity-70 hover:opacity-100 transition-opacity"
			>
				Forgot password?
			</Link>
		</div>
	)
}