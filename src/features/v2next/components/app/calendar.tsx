import styles from './calendar.module.scss';

export interface CalendarState {
  show: boolean;
  year: number | '';
  month: number | '';
  dayCount: number;
  firstDayWeek: number;
  select: string;
}

interface CalendarProps {
  calendar: CalendarState;
  onMonthChange: (direction: 1 | -1) => void;
  onSelect: (date: string) => void;
}

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 历史最热日历，挂载在右侧栏的 .sep20 里 */
export function Calendar({ calendar, onMonthChange, onSelect }: CalendarProps) {
  const { year, month, dayCount, firstDayWeek, select } = calendar;
  const monthNumber = Number(month) + 1;
  const total = dayCount + firstDayWeek;
  return (
    <div>
      <div className="sep" />
      <div className={`box ${styles.calender}`}>
        <div className={styles.month}>
          <div className="fade">历史最热</div>
          <div className={styles.caTitle}>
            <i className="fa fa-arrow-left" aria-hidden="true" onClick={() => onMonthChange(-1)} />
            <span>
              {year}年{monthNumber}月
            </span>
            <i className="fa fa-arrow-right" aria-hidden="true" onClick={() => onMonthChange(1)} />
          </div>
        </div>
        <div className={styles.calenderHeader}>
          {WEEK_DAYS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className={styles.days}>
          {Array.from({ length: total }, (_, index) => {
            const i = index + 1;
            const day = i - firstDayWeek;
            const date = `${year}-${monthNumber}-${day}`;
            return (
              <div
                key={i}
                className={`${styles.day} ${select === date ? styles.active : ''}`}
                onClick={() => onSelect(date)}
              >
                {day > 0 ? <a href={`/v2hot?${date}`}>{day}</a> : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="sep" />
    </div>
  );
}
