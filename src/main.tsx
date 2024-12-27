import { StrictMode, Suspense } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import "./index.css"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
			refetchOnWindowFocus: false,
		},
	},
})

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<Suspense fallback={<div>loading</div>}>
			<QueryClientProvider client={queryClient}>
				<App />
			</QueryClientProvider>
		</Suspense>
	</StrictMode>,
)
