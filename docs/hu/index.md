<!-- A docs/en/index.md magyar fordítása. Előbb a book és a docs/en változik, utána ez a fájl. -->

# Expose

Az `@atom-forge/expose` egy kis TypeScript-könyvtár, amely azt szabályozza, mi hagyhatja el a szervert: semmi nem jut el a klienshez, amit egy *nézet* (view) meg nem nevez. Ha egy tábla új oszlopot kap, az mindaddig a szerveren marad, amíg valaki hozzá nem adja egy nézethez, és a fordító pontosan ismeri a kimenő adat alakját.

Nincs függősége, és bármilyen adatbázisréteggel vagy átviteli móddal használható, mert a nézet egy egyszerű függvény.

## Első lépések

### Telepítés

```sh
bun add @atom-forge/expose
```

A csomag csak ESM-ként érhető el, és tartalmazza a saját típusdeklarációit.

### Nézet írása és a kimenet felépítése

A nézet megkapja a forrássort, és visszaadja azt a részt, amelyért felel, minden mezőt megnevezve. Az `expose` lefuttatja a nézeteket a soron, és összefésüli, amit visszaadnak:

```ts
import { expose } from '@atom-forge/expose';

const identity = (source: { id: string; name: string }) => ({
	id: source.id,
	name: source.name,
});
const contact = (source: { email: string }) => ({ email: source.email });

const row = { id: 'u1', name: 'Ada', email: 'ada@example.com', passwordHash: 'secret' };

const output = expose(row, identity, contact);
// { id: 'u1', name: 'Ada', email: 'ada@example.com' }

output.email; // string
// output.passwordHash; // fordítási hiba: nincs a kimeneten
```

A `passwordHash` a szerveren marad, mert egyetlen nézet sem nevezi meg. Ugyanez igaz minden oszlopra, amelyet később adnak a táblához.

### Egyszerű mezők megnevezése

Változatlanul másolt mezőknél a `fieldsOf` megspórolja a nézet kézi megírását. Adj meg neki egy típust, amely felsorolja a név szerint kiadható mezőket, majd a hívásnál nevezd meg őket:

```ts
import { expose, fieldsOf } from '@atom-forge/expose';

type PublicUser = { id: string; name: string; email: string };
const fields = fieldsOf<PublicUser>();

const output = expose(row, fields('id', 'name'));
// { id: 'u1', name: 'Ada' }
```

### Hiányozható sorok

A `null` és az `undefined` nézet futtatása nélkül `null` lesz, így egy opcionális kapcsolatnál nem kell ellenőrzés a hívás helyén. Az eredmény típusa csak akkor tartalmazza a `null`-t, ha a forrás típusa megengedi a hiányt:

```ts
const author = row as typeof row | null;
const output = expose(author, identity); // { id: string; name: string } | null
```

## Nézetek

A nézet alakja `(source, output) => sajátRész`. A `source` a sor, az `output` pedig az, amit a korábbi nézetek felépítettek. A nézet csak a saját részét adja vissza; az összefésülést az `expose` végzi.

### Mezők megnevezése a `fieldsOf` függvénnyel

A `fieldsOf<S>()` nézetgyárat készít egy entitáshoz. Az `S` felsorolja a név szerint kiadható mezőket; a gyár a neveket kapja meg, és egy nézetet ad vissza. Változatlanul másolt mezőkhöz használd, számolt mezőkhöz és beágyazott adatokhoz pedig írj kézzel nézetet.

```ts
import { expose, fieldsOf } from '@atom-forge/expose';

type PublicUser = { id: string; name: string; email: string };
const fields = fieldsOf<PublicUser>();

const output = expose(row, fields('id', 'name'));
// { id: 'u1', name: 'Ada' }

output.email; // fordítási hiba: nem lett megnevezve
fields('nmae'); // fordítási hiba: nincs ilyen mező
fields('passwordHash'); // fordítási hiba: nincs a PublicUser típusban
```

A sortól csak a megnevezett mezőket kéri, így egy csak néhány oszlopot beolvasó lekérdezés is megfelel, a be nem olvasott oszlop megnevezése pedig fordítási hiba:

```ts
const partial = { id: 'u1', name: 'Ada' };

expose(partial, fields('id', 'name'));
expose(partial, fields('email')); // fordítási hiba: a sorban nincs email
```

A nevek száma nincs korlátozva. Az eredmény ugyanolyan nézet, mint a többi, tehát összeállítható és kombinálható más nézetekkel:

```ts
expose(row, fields('id', 'name'), contact);
```

A `fieldsOf<PublicUser>()` üres hívására azért van szükség, mert a TypeScript nem enged egy típusparamétert kézzel megadni, a másikat pedig kikövetkeztetni.

### A későbbi nézetek felülírnak

A részek balról jobbra fésülődnek össze, így a későbbi kulcs lecseréli a korábbit, a típusokban is:

```ts
const output = expose(row, identity, () => ({ name: 'Anonymous' }));
// { id: 'u1', name: 'Anonymous' }
```

### A korábbi kimenet olvasása

Egy nézet építhet arra, ami már megvan. Az `output` fagyasztott, így a nézet nem tudja helyben módosítani:

```ts
const label = (_source: unknown, output: Readonly<{ name: string; email: string }>) => ({
	label: `${output.name} <${output.email}>`,
});

expose(row, identity, contact, label);
```

### Nézetek összeállítása

A `compose` nevet ad nézetek egy kombinációjának. Az eredmény maga is nézet, tehát átadható az `expose`-nak, vagy tovább kombinálható. A forrástípusa az összes nézete mezőit megköveteli:

```ts
import { compose } from '@atom-forge/expose';

const card = compose(identity, contact);
const output = expose(row, card);
```

Az összeállított nézet megtartja, amit a korábbi nézetek felépítettek, mint bármely más nézet.

### Hozzáadás egy kulcshoz a `Stacked` típussal

Néha több nézet is hozzájárul ugyanahhoz a kulcshoz, például amikor mindegyik néhány megnevezett linket választ ki. Az ilyen nézet kiolvassa a kulcsot az `output`-ból, visszaadja az egyesített értéket, és `Stacked` jelöléssel látja el. A jelölés azt mondja a típusoknak, hogy a kulcs összeadódik, nem cserélődik; futásidőben az összeadást maga a nézet végzi.

```ts
import { expose, type Stacked } from '@atom-forge/expose';

const links = <N extends string>(...names: N[]) =>
	(source: { links: Record<string, string> }, output: Readonly<Record<string, any>>) => {
		const picked = {} as Partial<Record<N, string>>;
		for (const name of names) if (Object.prototype.hasOwnProperty.call(source.links, name)) picked[name] = source.links[name];
		return { links: { ...output.links, ...picked } as Stacked<Partial<Record<N, string>>> };
	};

const row = { links: { home: 'h', work: 'w', private: 'p' } as Record<string, string> };

const output = expose(row, links('home'), links('work'));
// { links: { home: 'h', work: 'w' } }
// output.links.private; // fordítási hiba: nem lett megnevezve
```

Az ilyen nézetben az `output` típusa legyen `Readonly<Record<string, any>>`, hogy bármely korábbi nézet után használható legyen.

## Egy alkalmazás felépítése

A könyvtár semmit nem tud az entitásaidról. Bevált felépítés, ha minden entitás nézetei egy fájlban vannak, és egy közönséges `views` objektumba gyűlnek, így minden hívás ugyanúgy olvasható.

```ts
// server/views/user.ts
import { fieldsOf } from '@atom-forge/expose';

type PublicUser = { id: string; name: string; email: string };

export const fields = fieldsOf<PublicUser>();
export const privateSalary = (source: { salary: number }) => ({ salary: source.salary });
```

```ts
// server/views/index.ts
import * as user from './user';

export const views = { user };
```

```ts
// a hívás helyén
import { expose } from '@atom-forge/expose';
import { views } from '../views';

return rows.map(row => expose(row, views.user.fields('id', 'name')));
```

### Ki és mit

Két kérdést tarts külön. A modul dönti el, *ki* kaphatja meg az adatot, a szokásos jogosultság-ellenőrzésével. A nézet csak azt mondja meg, *mi* megy ki, és semmit nem tud ellenőrizni a hívóról. Ha egy nézet érzékeny adatot visz, ez látsszon a nevén, és csak az ellenőrzés után hívd:

```ts
assertCanReadSalary(viewer, row); // a saját jogosultság-ellenőrzésed
return expose(row, views.user.fields('id', 'name'), views.user.privateSalary);
```

### A nyers sorok távol tartása

A könyvtár nem tudja megakadályozni, hogy a kód `expose` hívása nélkül adjon vissza egy sort. Ha ez a projektedben számít, írj egy tesztet, amely megkeresi a szerverkódban a tiltani kívánt kimeneteket, a kivételekhez pedig explicit engedélylistát használ.

## API-referencia

### `expose(source, ...views)`

```ts
function expose<S, A>(source: S, a: View<NonNullable<S>, {}, A>): A | Nullish<S>;
```

Balról jobbra lefuttatja a nézeteket a `source` értéken, és visszaadja az összefésült kimenetet. Egy–négy nézetet fogad; a fenti aláírás az egynézetes alakot mutatja. Ennél többhöz kombináld őket a `compose` függvénnyel.

Ha a `source` `null` vagy `undefined`, `null`-t ad vissza, és egyetlen nézetet sem futtat. Az eredmény típusa csak akkor tartalmazza a `null`-t, ha a `source` típusa megengedi a hiányzó értéket.

### `compose(...views)`

```ts
function compose<S1, A, S2, B>(a: View<S1, {}, A>, b: View<S2, A, B>): View<S1 & S2, {}, Merge<A, B>>;
```

Új nézetet ad vissza, amely sorban lefuttatja a megadott nézeteket a kapott kimenetre építve. Két vagy három nézetet fogad; a fenti aláírás a kétnézetes alakot mutatja. Ennél többhöz egy már összeállított nézetet kombinálj tovább.

### `fieldsOf<S>()`

```ts
function fieldsOf<S>(): <K extends keyof S>(...names: K[]) => (source: Pick<S, K>) => Pick<S, K>;
```

Olyan gyárat ad vissza, amely az `S` mezőneveit kapja meg, és egy ezeket a mezőket másoló nézetet ad vissza. Az engedélyezett mezők listája csak a típusokban létezik: futásidőben a nézet azokat a neveket másolja, amelyeket megkapott.

### `View<S, O, R>`

```ts
type View<S, O, R> = (source: S, output: Readonly<O>) => R;
```

Az `S` a nézet által olvasott forrás, az `O` az előtte felépített kimenet, az `R` pedig a visszaadott rész. Az `R` egyszerű objektum legyen, szinkron módon visszaadva.

### `Stacked<T>`

Olyan kulcs típusát jelöli, amely a korábbi értékhez hozzáad, nem pedig lecseréli. Csak a típusokra hat; az összeadást a nézet végzi az `output` segítségével.

### `Merge<A, B>`

A `B` `A` fölé fésülésének típusa: a `B` kulcsai felülírják az `A` kulcsait, a `Stacked` kulcsok pedig `A[K] & B[K]` típusúak lesznek.

## Buktatók

Az engedélylista csak addig véd, amíg a nézetek megnevezik a mezőiket. Ezeket a könyvtár nem tudja helyetted ellenőrizni.

- **A forrás szétterítése.** A `({ ...source })` minden oszlopot kienged, a később hozzáadottakat is. Nevezz meg minden mezőt.
- **Beágyazott objektum változatlan visszaadása.** A `({ author: source.author })` a teljes `author` sort kiküldi. Futtasd a saját nézetén keresztül: `author: expose(source.author, identity)`.
- **Kérésből jövő nevek átadása a `fields` függvénynek.** A `fieldsOf<S>()` engedélyezett mezőinek listája csak a típusokban létezik. A `fields(...request.fields)` egy típuskényszerítéssel azt másolja, amit a hívó kér. A mezőket a kódban nevezd meg.
- **Objektum felvétele a `fieldsOf` típusába.** Az ebben a típusban szereplő mező változatlanul kimegy, így egy objektum is egészben, minden később kapott kulcsával együtt. Hagyd ki a típusból, és írj hozzá nézetet.
- **A nézet jogosultság-ellenőrzésként kezelése.** A nézet azt mondja meg, mi megy ki, azt nem, hogy ki kaphatja meg. A jogosultságot a hívás előtt ellenőrizd.
- **Az `output` beágyazott értékének módosítása.** Az `output` csak a legfelső szinten fagyasztott. Ha egy nézet az `output.links` értékébe ír, egy korábbi nézet értékét változtatja meg. Inkább új objektumot építs, ahogy a `Stacked` példában.
- **A `Stacked` jelölés elhagyása.** Nélküle a típusok szerint a kulcs lecserélődött, pedig a nézet hozzáadott, így a korábbi nevek hiányoznak a kimenet típusából.
- **`async` nézet.** A nézetek szinkron futnak. A visszaadott promise tulajdonságai nem fésülődnek össze, így az adata nem jut el a kimenetre, miközben a típusok promise-t írnak le. Előbb töltsd be az adatot, és a soron add át.
- **Nem egyszerű objektum visszaadása.** A rész objektum-szétterítéssel fésülődik össze: egy tömb vagy szöveg számozott kulcsokként jelenne meg.

## Frissítés

Még nem jelent meg kiadott verzió.
