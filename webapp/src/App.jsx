import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import KornelsenJournal from './KornelsenJournal';
import QuoteCalculator from './features/quote/QuoteCalculator';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<KornelsenJournal />} />
          <Route path="/quote" element={<QuoteCalculator />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
