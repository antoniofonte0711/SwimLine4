# SwimLine4

## Cosa contiene
- Login / Registrazione con ruoli (atleta, coach, genitore, admin)
- Dashboard con accesso ad Allenamenti e Gare
- Sezione Allenamenti: inserimento tempi con parziali, tipo di lavoro, video/foto, commento
- Sezione Gare: storico gare con tempo ed esito
- Pannello Admin riservato: visibile e accessibile solo a chi ha `role = 'admin'`

## 1. Installa le dipendenze
```
npm install
```

## 2. Crea un progetto Supabase (gratuito)
1. Vai su https://supabase.com e crea un account/progetto
2. Vai su SQL Editor e incolla tutto il contenuto di `supabase/schema.sql`, poi esegui
3. Vai su Storage e crea un bucket chiamato `video-allenamenti` (privato)
4. Vai su Project Settings > API e copia URL e chiave "anon public"

## 3. Configura le variabili d'ambiente
Copia `.env.example` in un nuovo file `.env` e incolla i valori copiati al punto 2

## 4. Avvia il progetto
```
npm run dev
```

## 5. Diventare admin (solo la prima volta)
Registrati normalmente dall'app, poi su Supabase, Table Editor, tabella `profiles`,
cambia manualmente `role` in `admin` sulla tua riga.

## 6. Portarlo su GitHub
```
git init
git add .
git commit -m "Prima versione SwimLine4"
git branch -M main
git remote add origin <link-del-tuo-repository-github>
git push -u origin main
```
