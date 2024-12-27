import { Rx, useRx, useRxValue } from "@effect-rx/rx-react"
import { UseQueryOptions, useQuery } from "@tanstack/react-query"
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

const pokemon$ = pipe(
	pokemonNameDebounced$,
	Rx.transform((get) => {
		const name = get(pokemonNameDebounced$)
		return getPokemon(name)
	}),
)

const capsMon$ = Rx.map(pokemonName$, (pn) => pn.toUpperCase())

type UseRxQuery<T, E> = Exclude<UseQueryOptions<T, E>, "queryFn"> & {
	queryFn$: Rx.Writable<Effect.Effect<T, E, never>, string>
}

function useRxQuery<T, E>({ queryFn$, ...rest }: UseRxQuery<T, E>) {
	const queryFn = useRxValue(queryFn$)
	return useQuery({
		queryFn: () => Effect.runPromise(queryFn),
		...rest,
	})
}

export default function App() {
	const [pokemonName, setPokemonName] = useRx(pokemonName$)
	const nameDebounced = useRxValue(pokemonNameDebounced$)
	const pokemon = useRxQuery({
		queryKey: ["pokemon", nameDebounced],
		queryFn$: pokemon$,
	})

	const pokemonCaps = useRxValue(capsMon$)

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
			<pre>{JSON.stringify(pokemon.data, null, 2)}</pre>
			<pre>{JSON.stringify(pokemon.error, null, 2)}</pre>
		</div>
	)
}
