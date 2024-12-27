import { Rx, useRx, useRxValue } from "@effect-rx/rx-react"
import {
	QueryKey,
	UseMutationOptions,
	UseQueryOptions,
	UseQueryResult,
	useMutation,
	useQuery,
} from "@tanstack/react-query"
import { Duration, Effect, Schema as S, pipe } from "effect"

class Pokemon extends S.Class<Pokemon>("Pokemon")({
	id: S.Number,
	name: S.String,
	sprites: S.Struct({
		front_default: S.String,
	}),
	types: S.Array(S.Struct({ type: S.Struct({ name: S.String }) })),
	abilities: S.Array(S.Struct({ ability: S.Struct({ name: S.String }) })),
}) {}

const getPokemon = (name: string) =>
	pipe(
		Effect.promise(() => fetch(`https://pokeapi.co/api/v2/pokemon/${name}`)),
		Effect.andThen((response) => response.json()),
		Effect.andThen(S.decodeUnknown(Pokemon)),
	)

const pokemonName$ = Rx.make("pikachu")

const pokemonNameDebounced$ = pokemonName$.pipe(
	Rx.debounce(Duration.seconds(1)),
)

const pokemon$ = Rx.map(pokemonNameDebounced$, getPokemon)

const capsMon$ = Rx.map(pokemonName$, (pn) => pn.toUpperCase())

type UseRxQueryOptions<
	TQueryFnData,
	TError,
	TData,
	TQueryKey extends QueryKey,
> = Exclude<
	UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
	"queryFn" | "queryKey"
> & {
	queryFn$: Rx.Writable<Effect.Effect<TQueryFnData, TError, never>, string>
}

function useRxQuery<
	TQueryFnData,
	TError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	queryKey: TQueryKey,
	queryFn$: Rx.Writable<Effect.Effect<TQueryFnData, TError, never>, string>,
	options?: Partial<UseRxQueryOptions<TQueryFnData, TError, TData, TQueryKey>>,
): UseQueryResult<TData, TError> {
	const queryFn = useRxValue(queryFn$)
	return useQuery({
		queryFn: () => Effect.runPromise(queryFn),
		...options,
		queryKey,
	})
}

type UseEffectMutation<
	TData = unknown,
	TError = Error,
	TVariables = void,
	TContext = unknown,
> = Exclude<
	UseMutationOptions<TData, TError, TVariables, TContext>,
	"mutationFn"
> & {
	mutationFn$: (vars: TVariables) => Effect.Effect<TData, TError, TContext>
}

function useEffectMutation<
	TData = unknown,
	TError = Error,
	TVariables = void,
	TContext = unknown,
>(
	mutationFn$: (vars: TVariables) => Effect.Effect<TData, TError>,
	options?: Partial<UseEffectMutation<TData, TError, TVariables, TContext>>,
) {
	return useMutation({
		mutationFn: (v) => {
			return Effect.runPromise(mutationFn$(v))
		},
		...options,
	})
}

export default function App() {
	const [pokemonName, setPokemonName] = useRx(pokemonName$)
	const nameDebounced = useRxValue(pokemonNameDebounced$)
	const pokemon = useRxQuery(["pokemon", nameDebounced], pokemon$)

	const pokemonCaps = useRxValue(capsMon$)

	const getPokemonName = useEffectMutation(
		(name: string) =>
			Effect.gen(function* () {
				console.log("getting pokemon")
				yield* Effect.sleep("1 second")
				const pokemon = yield* getPokemon(name)
				console.log("got pokemon")
				return pokemon.name
			}),
		{
			onMutate: (vars) => {
				return { name: "i" }
			},
		},
	)

	return (
		<div className="container mx-auto p-4 font-mono">
			<div>
				<pre>
					{JSON.stringify({ pokemonName, nameDebounced, pokemonCaps }, null, 2)}
				</pre>
			</div>
			<input
				className="border border-gray-400 p-2"
				value={pokemonName}
				onChange={(e) => setPokemonName(e.target.value)}
			/>
			<button
				onClick={() => {
					getPokemonName.mutate(pokemonName)
				}}
			>
				get name
			</button>
			<pre>{JSON.stringify(pokemon.data, null, 2)}</pre>
			<pre>{JSON.stringify(pokemon.error, null, 2)}</pre>
		</div>
	)
}
