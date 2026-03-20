import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

const FAQItem = ({ question, answer }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-t border-slate-300/80">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-6 py-6 text-left"
      >
        <span className="text-base font-bold text-slate-800">{question}</span>
        <span className="pt-0.5 text-slate-700">
          {open ? <Minus size={18} /> : <Plus size={18} />}
        </span>
      </button>
      {open && (
        <p className="max-w-[40rem] pb-6 text-sm leading-7 text-slate-600">
          {answer}
        </p>
      )}
    </div>
  );
};

const ModelFaq = ({ title, description, items }) => {
  return (
    <section className="rounded-[2rem] bg-[#faf6ef] px-6 py-8 shadow-[0_20px_45px_rgba(15,23,42,0.05)] sm:px-8 sm:py-10">
      <div className="mb-8 max-w-2xl">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            {description}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
        {items.map((item) => (
          <FAQItem
            key={item.question}
            question={item.question}
            answer={item.answer}
          />
        ))}
      </div>
    </section>
  );
};

export default ModelFaq;
