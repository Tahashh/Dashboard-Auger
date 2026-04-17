import React from 'react';

export default function TermsPolicy() {
  return (
    <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">DASHBOARD AUGER – TERMINI DI SERVIZIO</h1>
      
      <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Oggetto del servizio</h2>
      <p className="text-slate-600 mb-6">
        La DASHBOARD AUGER è una web app gestionale interna aziendale progettata per il monitoraggio di articoli, lavorazioni e disponibilità dei pezzi.
        L’applicazione ha lo scopo di fornire un sistema semplice, veloce e chiaro per la gestione operativa della produzione e del magazzino.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Ambito di utilizzo</h2>
      <p className="text-slate-600 mb-6">
        La piattaforma è destinata esclusivamente all’uso interno aziendale.
        È vietato: l’uso da parte di utenti non autorizzati, la diffusione esterna dei dati, qualsiasi utilizzo non conforme alle attività aziendali.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Accesso al sistema</h2>
      <p className="text-slate-600 mb-6">
        L’accesso alla dashboard è protetto tramite login. L’utente è responsabile dell’utilizzo delle proprie credenziali e della riservatezza dell’accesso.
        In caso di accesso non autorizzato, l’uso del sistema è vietato.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Funzionalità del sistema</h2>
      <p className="text-slate-600 mb-6">
        La dashboard è strutturata in tre aree principali:
        <br/><strong>Gestione Articoli:</strong> Permette di visualizzare e gestire Articoli, Impegni clienti, Disponibilità. Consente la registrazione delle lavorazioni. Ogni processo aggiorna i dati produttivi degli articoli.
        <br/><strong>Impegni clienti:</strong> Permette di gestire articoli impegnati, quantità richieste dai clienti. Le modifiche aggiornano automaticamente la disponibilità.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Responsabilità dell’utente</h2>
      <p className="text-slate-600 mb-6">
        L’utente è responsabile della correttezza dei dati inseriti, dell’aggiornamento delle lavorazioni, della gestione degli impegni.
        L’azienda non è responsabile per errori di inserimento dati, utilizzi impropri del sistema.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Disponibilità del servizio</h2>
      <p className="text-slate-600 mb-6">
        Il sistema può essere soggetto a aggiornamenti, modifiche, interruzioni temporanee senza preavviso.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Evoluzione del sistema</h2>
      <p className="text-slate-600 mb-6">
        La DASHBOARD AUGER è progettata per essere modulare, scalabile, espandibile. Nuove funzionalità potranno essere aggiunte nel tempo.
      </p>

      <h1 className="text-3xl font-bold text-slate-900 mb-6">PRIVACY POLICY</h1>
      
      <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Tipologia di dati raccolti</h2>
      <p className="text-slate-600 mb-6">
        La dashboard gestisce esclusivamente dati operativi aziendali, tra cui: articoli, quantità lavorate, stati di produzione, impegni clienti. Non vengono raccolti dati personali sensibili.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Finalità del trattamento</h2>
      <p className="text-slate-600 mb-6">
        I dati vengono utilizzati esclusivamente per: gestione della produzione, monitoraggio delle lavorazioni, controllo disponibilità articoli.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Condivisione dei dati</h2>
      <p className="text-slate-600 mb-6">
        I dati non vengono condivisi con terze parti e restano all’interno dell’ambiente aziendale.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Conservazione dei dati</h2>
      <p className="text-slate-600 mb-6">
        I dati possono essere salvati tramite database aziendale (es. SQLite o PostgreSQL) o sistemi locali. La durata della conservazione dipende dalle esigenze operative aziendali.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Sicurezza</h2>
      <p className="text-slate-600 mb-6">
        Vengono adottate misure tecniche per proteggere l’accesso al sistema e limitare l’utilizzo agli utenti autorizzati. L’utente è comunque responsabile del proprio accesso e del dispositivo utilizzato.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Diritti e gestione dati</h2>
      <p className="text-slate-600 mb-6">
        L’azienda può modificare, aggiornare, eliminare i dati in base alle necessità operative.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Accettazione</h2>
      <p className="text-slate-600 mb-6">
        L’utilizzo della DASHBOARD AUGER implica l’accettazione dei presenti Termini di Servizio e Privacy Policy.
      </p>

      <div className="mt-12 pt-6 border-t border-slate-200 text-center text-sm text-slate-500">
        <p>Dashboard Auger</p>
      </div>
    </div>
  );
}
