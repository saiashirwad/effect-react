import {
	Registry,
	RegistryContext,
	Rx,
	useRx,
	useRxValue,
} from "@effect-rx/rx-react"
import {
	QueryKey,
	UseMutationOptions,
	UseQueryOptions,
	UseQueryResult,
	useMutation,
	useQuery,
} from "@tanstack/react-query"
import { Duration, Effect, Schema as S, pipe } from "effect"

function useRxQuery<
	TQueryFnData,
	TError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
	TInput = unknown,
>(
	queryKey: TQueryKey,
	queryFnEffect: Rx.Writable<
		Effect.Effect<TQueryFnData, TError, never>,
		TInput
	>,
	options?: Partial<
		Exclude<
			UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
			"queryFn" | "queryKey"
		>
	>,
): UseQueryResult<TData, TError> {
	const queryFn = useRxValue(queryFnEffect)
	return useQuery({
		queryFn: () => Effect.runPromise(queryFn),
		...options,
		queryKey,
	})
}

function useEffectMutation<
	TData = unknown,
	TError = Error,
	TVariables = void,
	TContext = unknown,
>(
	mutationFnEffect: (vars: TVariables) => Effect.Effect<TData, TError>,
	options?: Partial<
		Exclude<
			UseMutationOptions<TData, TError, TVariables, TContext>,
			"mutationFn"
		>
	>,
) {
	return useMutation({
		mutationFn: (v) => {
			return Effect.runPromise(mutationFnEffect(v))
		},
		...options,
	})
}

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

const registry = Registry.make()
registry.subscribe(pokemonName$, (name) => {
	console.log("name changed", name)
})

const rip$ = Rx.fn(() =>
	Effect.gen(function* () {
		return 5
	}),
)

const pokemonNameDebounced$ = pokemonName$.pipe(
	Rx.debounce(Duration.seconds(1)),
)

const pokemon$ = Rx.map(pokemonNameDebounced$, getPokemon)
const nameAndAbilities$ = Rx.map(pokemon$, (pokemon) =>
	Effect.gen(function* () {
		const poke = yield* pokemon
		yield* Effect.sleep("1 second")
		return {
			name: poke.name,
			abilities: poke.abilities,
		}
	}),
)

const capsMon$ = Rx.map(pokemonName$, (pn) => pn.toUpperCase())

function Playground() {
	const [pokemonName, setPokemonName] = useRx(pokemonName$)
	const nameDebounced = useRxValue(pokemonNameDebounced$)
	const pokemon = useRxQuery(["pokemon", nameDebounced], pokemon$)
	const nameAndAbilities = useRxQuery(
		["nameAndAbilities", nameDebounced],
		nameAndAbilities$,
	)

	const rip = useRxValue(rip$)

	const pokemonCaps = useRxValue(capsMon$)

	const getPokemonName = useEffectMutation((name: string) =>
		Effect.gen(function* () {
			console.log("getting pokemon")
			yield* Effect.sleep("1 second")
			const pokemon = yield* getPokemon(name)
			console.log("got pokemon")
			return pokemon.name
		}),
	)

	return (
		<div className="container mx-auto p-4 font-mono">
			<pre>{JSON.stringify(rip, null, 2)}</pre>
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
			<pre>{JSON.stringify(pokemon.data?.name, null, 2)}</pre>
			<pre>{JSON.stringify(pokemon.error, null, 2)}</pre>
			<pre>{JSON.stringify(nameAndAbilities.data?.name, null, 2)}</pre>
			<pre>{JSON.stringify(nameAndAbilities.error, null, 2)}</pre>
		</div>
	)
}

export default function App() {
	return (
		<RegistryContext.Provider value={registry}>
			<Playground />
		</RegistryContext.Provider>
	)
}
