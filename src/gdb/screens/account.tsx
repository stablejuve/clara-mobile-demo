import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Eyebrow, Group, Hairline, Ico, ListRow, Toggle } from "../../ui/kit";
import { LargeTitleScreen } from "../../ui/LargeTitle";
import { T } from "../../ui/primitives";
import { F, RADIUS } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { feed, filterFeed, monthKey, monthLabel, toLocal, TYPE_FILTERS, type TypeFilter } from "../activity";
import { cop, tr, usd } from "../copy";
import { DEMO, gdb, useGdb } from "../store";
import { ActivityRow, ConsoleButton, nav, Notice, RoundAction } from "../ui";

/** Cuenta USD (pantalla 03): cuánto se puede gastar, las acciones y los últimos movimientos. Lo que está pendiente se ve como
 *  «Pendiente» en su movimiento, no como otro saldo. El único aviso es el de un retiro que falló, porque pide una acción. */
export function AccountScreen() {
  const { c } = useTheme();
  const { s, b, flags } = useGdb();
  const items = feed(s, DEMO.rate);
  const failed = s.withdrawals.find((w) => w.status === "failed");
  const canMove = b.available > 0;
  return (
    <LargeTitleScreen title={tr("acct.title")} back={tr("tab.benefits")} right={<ConsoleButton />}>
      <View style={{ paddingHorizontal: 16, gap: 24 }}>
        {/* El saldo, como lo piensa el empleado: en su moneda, con los dólares en chico debajo (se pueden ocultar). */}
        <View style={{ paddingHorizontal: 4, gap: 2 }}>
          <T w={500} s={15} color={c.ink55}>{tr("acct.available")}</T>
          <T s={60} lh={1} color={c.inkStrong} accessibilityLabel="available" style={{ fontFamily: F.display }}>{cop(toLocal(b.available, DEMO.rate))}</T>
          {flags.showUsd ? <T w={400} s={17} color={c.ink55} accessibilityLabel="available-usd" style={{ paddingTop: 4 }}>{usd(b.available)} USD</T> : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 4, minHeight: 36, marginTop: -8 }}>
          <T w={500} s={16} color={c.inkStrong} style={{ flex: 1 }}>{tr("txs.showUsd")}</T>
          <Toggle on={flags.showUsd} onChange={(v) => gdb.setShowUsd(v)} accessibilityLabel="acct-show-usd" />
        </View>
        {failed ? <Notice tone="bad" text={tr("acct.n.reversal", { amount: usd(failed.usd) })} />
          : b.inTransit > 0 ? <Notice tone="wait" text={tr("acct.n.deposit", { employer: s.invitation.employer })} /> : null}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 12 }}>
          <RoundAction icon="card" label={tr("acct.card")} onPress={() => nav("card")} a11y="acct-card" />
          <RoundAction icon="landmark" label={tr("acct.withdraw")} onPress={() => nav("send")} disabled={!canMove} a11y="acct-withdraw" />
        </View>
        <View style={{ gap: 8 }}>
          <Eyebrow style={{ paddingHorizontal: 4 }}>{tr("acct.activity")}</Eyebrow>
          <Group>
            {items.length === 0 ? (
              <View style={{ paddingVertical: 28, alignItems: "center" }}><T w={400} s={15} color={c.ink40}>{tr("acct.empty")}</T></View>
            ) : items.slice(0, 4).map((it, n) => (
              <View key={it.id}>
                {n > 0 ? <Hairline inset={66} /> : null}
                <ActivityRow item={it} showUsd={flags.showUsd} onPress={() => nav("movement", { id: it.id })} />
              </View>
            ))}
            {items.length > 0 ? <><Hairline /><ListRow title={tr("common.seeAll")} chevron onPress={() => openActivity("all")} accessibilityLabel="acct-all" /></> : null}
          </Group>
        </View>
      </View>
    </LargeTitleScreen>
  );
}

/** Filtro con que se abre la lista la próxima vez (la tarjeta la abre en «Compras»). */
let openWith: TypeFilter = "all";
export function openActivity(type: TypeFilter = "all"): void { openWith = type; nav("activity"); }

/** Movimientos (pantalla 08): búsqueda por nombre, filtro por tipo, el interruptor para ver también los dólares y la lista por mes
 *  (cada mes se puede plegar). */
export function ActivityScreen() {
  const { c } = useTheme();
  const { s, flags } = useGdb();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>(() => { const t = openWith; openWith = "all"; return t; });
  const [closed, setClosed] = useState<readonly string[]>([]);
  const items = filterFeed(feed(s, DEMO.rate), query, type);
  const months = [...new Set(items.map((it) => monthKey(it.at)))];
  return (
    <LargeTitleScreen title={tr("acct.activity")} back={tr("acct.title")}>
      <View style={{ paddingHorizontal: 16, gap: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 44, paddingHorizontal: 14, borderRadius: RADIUS.pill, backgroundColor: c.ink04 }}>
          <Ico name="search" size={18} color={c.ink40} sw={2} />
          <TextInput value={query} onChangeText={setQuery} placeholder={tr("txs.search")} placeholderTextColor={c.ink40} selectionColor={c.brand} autoCorrect={false} autoCapitalize="none"
            accessibilityLabel="txs-search" style={{ flex: 1, padding: 0, fontFamily: F.r, fontSize: 16, color: c.inkStrong }} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {TYPE_FILTERS.map((f) => {
            const on = f === type;
            return (
              <Pressable key={f} onPress={() => setType(f)} accessibilityLabel={`txs-type-${f}`} accessibilityState={{ selected: on }}
                style={{ height: 34, paddingHorizontal: 14, borderRadius: RADIUS.pill, justifyContent: "center", backgroundColor: on ? c.cta : c.ink04 }}>
                <T w={on ? 600 : 500} s={14} color={on ? c.onCta : c.inkStrong}>{tr(`txs.${f}`)}</T>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 4, minHeight: 36 }}>
          <T w={500} s={16} color={c.inkStrong} style={{ flex: 1 }}>{tr("txs.showUsd")}</T>
          <Toggle on={flags.showUsd} onChange={(v) => gdb.setShowUsd(v)} accessibilityLabel="txs-show-usd" />
        </View>
        {items.length === 0 ? (
          <View style={{ paddingVertical: 28, alignItems: "center" }}><T w={400} s={15} color={c.ink40}>{tr(s.auths.length + s.withdrawals.length + s.fundings.length === 0 ? "acct.empty" : "txs.none")}</T></View>
        ) : months.map((m) => {
          const rows = items.filter((it) => monthKey(it.at) === m);
          const open = !closed.includes(m);
          return (
            <View key={m} style={{ gap: 8 }}>
              <Pressable onPress={() => setClosed((x) => (open ? [...x, m] : x.filter((k) => k !== m)))} accessibilityLabel={`txs-month-${m}`}
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 4, minHeight: 32 }}>
                <T w={500} s={14} color={c.ink55} style={{ flex: 1, textTransform: "capitalize" }}>{monthLabel(rows[0].at)}</T>
                <View style={{ transform: [{ rotate: open ? "270deg" : "90deg" }] }}><Ico name="chevronRight" size={18} color={c.ink40} sw={2} /></View>
              </Pressable>
              {open ? (
                <Group>
                  {rows.map((it, n) => (
                    <View key={it.id}>
                      {n > 0 ? <Hairline inset={66} /> : null}
                      <ActivityRow item={it} showUsd={flags.showUsd} onPress={() => nav("movement", { id: it.id })} />
                    </View>
                  ))}
                </Group>
              ) : null}
            </View>
          );
        })}
      </View>
    </LargeTitleScreen>
  );
}
