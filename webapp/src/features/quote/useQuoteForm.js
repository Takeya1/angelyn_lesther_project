import { useState } from 'react';

const INITIAL = {
  customerName: '',
  customerTier: 0,       // 0=New, 1=Recurring, 2=Loyalty
  isLenworth: false,
  distance: '',
  workType: [],
  doorGeneral: '',       // also drives product_type_target_enc lookup + flags
  dimWidth: '',          // feet
  dimHeight: '',         // feet
  quantity: 1,
  bumpers: false,
  dropTest: false,
  operatorOpener: false,
  jobComplexity: 2.5,
};

export default function useQuoteForm() {
  const [form, setForm] = useState(INITIAL);
  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const reset = () => setForm(INITIAL);
  return { form, update, reset };
}
