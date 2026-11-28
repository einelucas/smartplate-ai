import styles from "./progress.module.css";
export default function ProgressLoading() {
  return <div className={styles.screen + " animate-pulse"} role="status" aria-label="Carregando progresso">
    <div className="h-14 w-40 rounded-xl bg-[#e1ebef]" />
    <div className="h-12 rounded-full bg-[#e1ebef]" />
    <div className={styles.card + " h-[310px]"} />
    <div className={styles.twoCards}><div className={styles.card + " h-40"}/><div className={styles.card + " h-40"}/></div>
    <div className={styles.card + " h-40"}/>
  </div>;
}
