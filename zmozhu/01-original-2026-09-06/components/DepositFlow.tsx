// The complete offer is visible immediately, without waiting for animation.
export default function DepositFlow() {
  return (
    <div className="deposit-offer">
      <p className="deposit-support">30 днів щоденної підтримки та фінансової мотивації</p>
      <div className="deposit-amounts">
        <div>
          <p className="deposit-label">Внесок на старті</p>
          <p className="deposit-value">2000 <span>грн</span></p>
        </div>
        <span className="deposit-direction" aria-hidden="true">→</span>
        <div>
          <p className="deposit-label">Виконала всі три умови</p>
          <p className="deposit-value">2000 <span>грн назад</span></p>
        </div>
      </div>
      <p className="deposit-conditions">−4% ваги · ранкові й вечірні чекіни · зважування</p>
      <p className="deposit-exception">Якщо хоча б одна умова не виконана, внесок не повертається. Підтримка триває до кінця 30 днів.</p>
      <a className="deposit-rules" href="#how">Усі умови повернення <span aria-hidden="true">↗</span></a>
    </div>
  );
}
