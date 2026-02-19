Selkeä kerrosjako

app/            → Navigation and screens

src/components/ → Reusable UI components

src/viewmodels/ → Business logic and state management

src/models/     → Data models and data access logic

firebase/       → Firebase configuration


State-hallinta ja datavirta 
 
src/viewmodels/ShopVMContext.tsx — pääasiallinen globaali state (käyttäjä, listat, itemit, toiminnot).
src/viewmodels/useMapViewModel.ts — karttanäkymän oma state + datavirta API:sta UI:hin.
src/viewmodels/useStatisticsViewModel.ts — tilastonäkymän state ja johdettu data.
src/viewmodels/ThemeContext.tsx — teeman globaali state (light/dark).
src/viewmodels/shop/subscriptions.ts — Firestore-kuuntelut, joista data virtaa contextiin.
src/viewmodels/shop/lists.ts, src/viewmodels/shop/items.ts, src/viewmodels/shop/categories.ts — datakerros (CRUD), jota context käyttää.

Luettava koodi

Luettava koodi toteutuu, koska vastuut on jaettu selkeästi (UI, viewmodelit, dataoperaatiot), funktiot on nimetty kuvaavasti ja toistuva Firestore-logiikka on eriytetty omiin tiedostoihin.


ShopVMContext.tsx:187-390
items.ts:30-168
lists.ts:21-94
categories.ts:27-92
CreateOrJoinListModal.tsx:33
profile.tsx:43-254
