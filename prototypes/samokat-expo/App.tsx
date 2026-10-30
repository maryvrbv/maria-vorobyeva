import { useMemo, useRef, useState, useEffect } from 'react';
import {
  Animated,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// ---------- tokens (из Figma: стили App/*, переменные Самоката) ----------
const C = {
  text: '#404040',
  secondary: '#595959',
  description: '#a6a6a6',
  brand: '#ff335f',
  bg: '#f2f2f2',
  chip: '#f8f8f8',
  divider: '#e0e0e0',
  toggleOff: '#e8e8eb',
  pinkLight: '#ffedf2',
  priceBtn: '#ffebef',
  green: '#148f2b',
  white: '#ffffff',
};

const NB = ' ';
const rub = (n: number) => `${n}${NB}₽`;

type Weight = '500' | '600' | '700';
const t = (size: number, lineHeight: number, weight: Weight, letterSpacing = 0): TextStyle => ({
  fontSize: size,
  lineHeight,
  fontWeight: weight,
  letterSpacing,
  ...(Platform.OS === 'web' ? { fontFamily: '-apple-system, "SF Pro Text", "SF Pro", system-ui, sans-serif' } : null),
});
const T = {
  display: t(33, 40, '600', -0.4),
  h2: t(21.5, 26, '700'),
  h3Bold: t(20, 24, '700', -0.1),
  h3: t(17, 21, '600', -0.3),
  price: t(17, 21, '600', 0.15),
  bodyMedium: t(16, 19, '500', 0.1),
  bodySemibold: t(16, 19, '600', -0.05),
  buttonL: t(16, 20, '700'),
  caption: t(14, 16, '500'),
  captionSemibold: t(14, 16, '600'),
  label: t(13, 16, '500'),
  priceButton: t(13, 16, '500'),
  small: t(12, 13, '500'),
};

// ---------- data ----------
type Store = 'samokat' | 'apteka' | 'hyper';
type Item = { id: string; name: string; weight: string; price: number; old?: number; img: ImageSourcePropType; store: Store; qty: number };

const IMG = {
  chupa: require('./assets/products/chupa.png'),
  hanuta: require('./assets/products/hanuta.png'),
  snickers: require('./assets/products/snickers.png'),
  syrup: require('./assets/products/syrup.png'),
  plaster: require('./assets/products/plaster.png'),
  diapers: require('./assets/products/diapers.png'),
  milk: require('./assets/products/milk.png'),
  det: require('./assets/products/det.png'),
  cat: require('./assets/products/cat.png'),
};

const INITIAL: Item[] = [
  { id: 'chupa', name: 'Карамель Chupa Chups, Новогодняя', weight: `17${NB}г`, price: 30, old: 41, img: IMG.chupa, store: 'samokat', qty: 1 },
  { id: 'hanuta', name: 'Из Германии: Вафельное печенье Hanuta', weight: `44${NB}г`, price: 135, img: IMG.hanuta, store: 'samokat', qty: 1 },
  { id: 'snickers', name: 'Шоколадный батончик Snickers', weight: `4 × 40${NB}г`, price: 199, img: IMG.snickers, store: 'samokat', qty: 1 },
  { id: 'syrup', name: `Сироп от температуры для детей, 100${NB}мл`, weight: `с 3${NB}месяцев`, price: 389, img: IMG.syrup, store: 'apteka', qty: 1 },
  { id: 'plaster', name: 'Пластыри бактерицидные', weight: `20${NB}шт.`, price: 159, img: IMG.plaster, store: 'apteka', qty: 1 },
  { id: 'diapers', name: `Подгузники, размер 4, 52${NB}шт.`, weight: `9–14${NB}кг`, price: 1290, img: IMG.diapers, store: 'hyper', qty: 1 },
  { id: 'milk', name: 'Молоко 3,2%', weight: `1${NB}л`, price: 89, img: IMG.milk, store: 'hyper', qty: 1 },
];

const EXTRA = [
  { id: 'det', name: 'Средство для стирки', weight: `1,5${NB}л`, price: 549, img: IMG.det },
  { id: 'cat', name: 'Корм для кошек', weight: `1,5${NB}кг`, price: 399, img: IMG.cat },
  { id: 'milk-h', name: 'Молоко 3,2%', weight: `1${NB}л`, price: 89, img: IMG.milk },
];

const STORE = {
  samokat: { name: 'Самокат', when: 'Через 15 минут', short: '15 мин', sub: 'Привезёт курьер Самоката', delivery: 0 },
  apteka: { name: 'Аптека', when: 'Через 25 минут', short: '25 мин', sub: 'Отдельный курьер из аптеки', delivery: 49 },
  hyper: { name: 'Гипермаркет', when: `К${NB}20:00`, short: '20:00', sub: `Соберут в${NB}гипермаркете, окно 19:30–20:00`, delivery: 99 },
} as const;

const ASSEMBLY = 49;
const PROMO = 200;

// ---------- icons ----------
function Logo({ store, size = 20 }: { store: Store; size?: number }) {
  const bg = store === 'samokat' ? '#FF335F' : store === 'apteka' ? '#22B04B' : '#2F6BFF';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width={24} height={24} rx={7} fill={bg} />
      {store === 'samokat' && <Path d="M13 3L6 13h5l-1 8 7-10h-5l1-8z" fill="#fff" />}
      {store === 'apteka' && <Path d="M10 5h4v5h5v4h-5v5h-4v-5H5v-4h5z" fill="#fff" />}
      {store === 'hyper' && (
        <Path d="M5 8h14l-1.5 9h-11zM9 8l2-4M15 8l-2-4" stroke="#fff" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      )}
    </Svg>
  );
}
const Icon = {
  down: () => (
    <Svg width={20} height={20} viewBox="0 0 20 20"><Path d="M5 7.5l5 5 5-5" stroke={C.text} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
  ),
  share: () => (
    <Svg width={22} height={22} viewBox="0 0 22 22"><Path d="M12.5 5.5V3l6 5.5-6 5.5v-2.6c-4.3 0-7 1.2-9 4.6.6-4.8 3.3-8.9 9-9.5z" fill={C.text} /></Svg>
  ),
  minus: () => (
    <Svg width={20} height={20} viewBox="0 0 20 20"><Path d="M4 10h12" stroke={C.text} strokeWidth={1.8} strokeLinecap="round" /></Svg>
  ),
  plus: (color: string = C.text, size = 20) => (
    <Svg width={size} height={size} viewBox="0 0 20 20"><Path d="M10 4v12M4 10h12" stroke={color} strokeWidth={1.8} strokeLinecap="round" /></Svg>
  ),
  chevron: () => (
    <Svg width={20} height={20} viewBox="0 0 20 20"><Path d="M8 5l5 5-5 5" stroke="#bfbfbf" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
  ),
  check: () => (
    <Svg width={12} height={12} viewBox="0 0 12 12"><Path d="M2.5 6.2l2.3 2.3L9.5 3.8" stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
  ),
};

// ---------- building blocks ----------
function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[s.card, style]}>{children}</View>;
}
const Divider = () => <View style={s.divider} />;

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const a = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: value ? 1 : 0, useNativeDriver: false, bounciness: 6, speed: 18 }).start();
  }, [value]);
  return (
    <Pressable onPress={() => onChange(!value)} hitSlop={10}>
      <Animated.View style={[s.toggle, { backgroundColor: a.interpolate({ inputRange: [0, 1], outputRange: [C.toggleOff, C.brand] }) }]}>
        <Animated.View style={[s.knob, { transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) }] }]} />
      </Animated.View>
    </Pressable>
  );
}

function Stepper({ qty, onMinus, onPlus }: { qty: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={s.stepper}>
      <Pressable onPress={onMinus} hitSlop={8}>{Icon.minus()}</Pressable>
      <Text style={[T.bodyMedium, { color: C.text, minWidth: 8, textAlign: 'center' }]}>{qty}</Text>
      <Pressable onPress={onPlus} hitSlop={8}>{Icon.plus()}</Pressable>
    </View>
  );
}

function CartItem({ item, setQty }: { item: Item; setQty: (q: number) => void }) {
  return (
    <View style={s.item}>
      <View style={s.itemImg}><Image source={item.img} style={s.fill} /></View>
      <View style={s.itemText}>
        <View style={{ gap: 2 }}>
          <Text style={[T.small, { color: C.text, maxWidth: 215 }]} numberOfLines={2}>{item.name}</Text>
          <Text style={[T.small, { color: C.description }]}>{item.weight}</Text>
        </View>
        <View style={s.itemBottom}>
          <Stepper qty={item.qty} onMinus={() => setQty(item.qty - 1)} onPlus={() => setQty(item.qty + 1)} />
          <View style={s.row6}>
            {item.old ? <Text style={[T.price, { color: C.description, textDecorationLine: 'line-through' }]}>{item.old * item.qty}</Text> : null}
            <Text style={[T.price, { color: C.text }]}>{rub(item.price * item.qty)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function StoreChip({ store }: { store: Store }) {
  return (
    <View style={s.storeChip}>
      <Logo store={store} />
      <Text style={[T.label, { color: C.secondary }]}>{STORE[store].name}</Text>
    </View>
  );
}

function LogoStack({ stores }: { stores: Store[] }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {stores.map((st, i) => (
        <View key={st} style={[s.stackLogo, i > 0 && { marginLeft: -8 }]}><Logo store={st} size={28} /></View>
      ))}
    </View>
  );
}

function WaveHeader({ title, sub, right }: { title: string; sub: string; right: React.ReactNode }) {
  return (
    <View style={s.waveHeader}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[T.h2, { color: C.text }]}>{title}</Text>
        <Text style={[T.caption, { color: C.description }]}>{sub}</Text>
      </View>
      {right}
    </View>
  );
}

function Button({ label, size = 'L', onPress }: { label: string; size?: 'L' | 'S'; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [size === 'L' ? s.btnL : s.btnS, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}>
      <Text style={[size === 'L' ? T.buttonL : T.captionSemibold, { color: C.white }]}>{label}</Text>
    </Pressable>
  );
}

// ---------- screen ----------
function Cart() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Item[]>(INITIAL);
  const [together, setTogether] = useState(false);
  const [door, setDoor] = useState(false);
  const [other, setOther] = useState(false);
  const [spasibo, setSpasibo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastA = useRef(new Animated.Value(0)).current;

  const showToast = (msg: string) => {
    setToast(msg);
    toastA.setValue(0);
    Animated.sequence([
      Animated.timing(toastA, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastA, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  const setQty = (id: string, q: number) =>
    setItems((prev) => (q <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, qty: q } : i))));

  const speedUp = () => {
    setItems((prev) => prev.map((i) => (i.id === 'milk' ? { ...i, store: 'samokat', price: 85 } : i)));
    showToast('Молоко приедет через 15 минут');
  };
  const addExtra = (e: (typeof EXTRA)[number]) => {
    setItems((prev) => {
      const ex = prev.find((i) => i.id === e.id);
      if (ex) return prev.map((i) => (i.id === e.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { ...e, store: 'hyper' as Store, qty: 1 }];
    });
    showToast(`Добавили в${NB}доставку к${NB}20:00`);
  };

  const byStore = (st: Store) => items.filter((i) => i.store === st);
  const stores = (['samokat', 'apteka', 'hyper'] as Store[]).filter((st) => byStore(st).length > 0);
  const goods = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const delivery = together ? 0 : stores.reduce((sum, st) => sum + STORE[st].delivery, 0);
  const total = Math.max(0, goods + delivery + ASSEMBLY - PROMO);
  const milkInHyper = items.some((i) => i.id === 'milk' && i.store === 'hyper');
  const partsWord = stores.length === 1 ? 'части' : 'частей';

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 47 : 0) + 21 }} showsVerticalScrollIndicator={false}>
        <View style={s.handle} />
        <View style={[s.sheet, { paddingBottom: 40 + insets.bottom }]}>
          {/* Address */}
          <View style={s.address}>
            <Pressable style={s.row8}>
              <Text style={[T.h3Bold, { color: C.text }]}>ул. Примерная, 1</Text>
              {Icon.down()}
            </Pressable>
            <Pressable style={s.share}>{Icon.share()}</Pressable>
          </View>

          {/* Options */}
          <Card style={s.listCard}>
            <View style={s.optionRow}>
              <Text style={[T.bodyMedium, { color: C.secondary, flex: 1 }]}>Оставить у двери</Text>
              <Toggle value={door} onChange={setDoor} />
            </View>
            <Divider />
            <View style={s.optionRow}>
              <Text style={[T.bodyMedium, { color: C.secondary, flex: 1 }]}>Заказать другому</Text>
              <Toggle value={other} onChange={setOther} />
            </View>
          </Card>

          {/* Timeline */}
          {stores.length > 1 && (
            <Card style={[s.waveCard, { gap: 14 }]}>
              <View style={s.spaceBetween}>
                <Text style={[T.h3, { color: C.text }]}>{together ? 'Привезём всё вместе' : `Привезём в${NB}${stores.length}${NB}этапа`}</Text>
                <Text style={[T.caption, { color: C.description }]}>Один заказ</Text>
              </View>
              <Timeline stores={stores} together={together} />
              <View style={s.segmented}>
                {[
                  { on: !together, title: 'По готовности', sub: `${stores.length} доставки`, press: () => setTogether(false) },
                  { on: together, title: 'Всё вместе', sub: `к${NB}20:00, доставка 0${NB}₽`, press: () => setTogether(true) },
                ].map((o) => (
                  <Pressable key={o.title} onPress={o.press} style={[s.segOption, o.on && s.segOn]}>
                    <Text style={[T.captionSemibold, { color: o.on ? C.text : C.secondary }]}>{o.title}</Text>
                    <Text style={[T.small, { color: C.description }]}>{o.sub}</Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          )}

          {/* Waves */}
          {together ? (
            <Card style={s.waveCard}>
              <WaveHeader title={`К${NB}20:00`} sub={`Всё привезёт один курьер — доставка 0${NB}₽ вместо ${rub(stores.reduce((a, st) => a + STORE[st].delivery, 0))}`} right={<LogoStack stores={stores} />} />
              {items.map((i) => <CartItem key={i.id} item={i} setQty={(q) => setQty(i.id, q)} />)}
            </Card>
          ) : (
            stores.map((st) => (
              <Card key={st} style={s.waveCard}>
                <WaveHeader title={STORE[st].when} sub={STORE[st].sub} right={<StoreChip store={st} />} />
                {byStore(st).map((i) => <CartItem key={i.id} item={i} setQty={(q) => setQty(i.id, q)} />)}
                {st === 'hyper' && milkInHyper && (
                  <View style={s.speedUp}>
                    <Logo store="samokat" size={28} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[T.captionSemibold, { color: C.text }]}>Молоко есть в Самокате</Text>
                      <Text style={[T.small, { color: C.secondary }]}>{`Привезём через 15${NB}минут и${NB}на${NB}4${NB}₽ дешевле`}</Text>
                    </View>
                    <Button label="Ускорить" size="S" onPress={speedUp} />
                  </View>
                )}
                {st === 'hyper' && (
                  <View style={s.addMore}>
                    <Text style={[T.bodySemibold, { color: C.text }]}>Добавить в эту доставку</Text>
                    <Text style={[T.caption, { color: C.description }]}>{`Курьер уже едет из${NB}гипермаркета${NB}— доставка не${NB}подорожает`}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {EXTRA.map((e) => (
                        <View key={e.id} style={{ gap: 6 }}>
                          <View style={s.miniImg}><Image source={e.img} style={s.fill} /></View>
                          <Pressable onPress={() => addExtra(e)} style={({ pressed }) => [s.priceBtn, pressed && { opacity: 0.7 }]}>
                            <Text style={[T.priceButton, { color: C.text }]}>{rub(e.price)}</Text>
                            {Icon.plus(C.brand, 22)}
                          </Pressable>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </Card>
            ))
          )}

          {/* Payment */}
          <Card style={s.listCard}>
            <Pressable style={s.payRow}>
              <Text style={[T.bodyMedium, { color: C.secondary, flex: 1 }]}>{`ВЕЧЕР: −200${NB}₽ на${NB}весь заказ`}</Text>
              {Icon.chevron()}
            </Pressable>
            <Divider />
            <View style={s.payRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={s.row6}>
                  <Text style={[T.bodyMedium, { color: C.secondary }]}>СберСпасибо</Text>
                  <View style={s.spasibo}><Text style={{ color: C.white, fontSize: 11, fontWeight: '700' }}>С</Text></View>
                </View>
                <Text style={[T.caption, { color: C.description }]}>{spasibo ? `Спишем 686 бонусов` : `У вас 1419 бонусов — спишем до${NB}686`}</Text>
              </View>
              <Toggle value={spasibo} onChange={setSpasibo} />
            </View>
            <Divider />
            <Pressable style={[s.payRow, { paddingBottom: 8 }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={s.row6}>
                  <Text style={[T.bodyMedium, { color: C.secondary }]}>СберПрайм</Text>
                  <View style={s.prime}>{Icon.check()}</View>
                </View>
                <Text style={[T.caption, { color: C.description }]}>Начислим 3% бонусами со всего заказа</Text>
              </View>
              {Icon.chevron()}
            </Pressable>
            <View style={{ gap: 8, paddingBottom: 14 }}>
              <View style={[s.row, { gap: 4 }]}>
                <View style={[s.seg, { flex: 1 }]}><View style={[s.segFill, { width: '100%' }]} /></View>
                <View style={[s.seg, { width: 34 }]} />
                <View style={[s.seg, { width: 34 }]} />
              </View>
              <View style={s.spaceBetween}>
                <Text style={[T.caption, { color: C.text }]}>0%</Text>
                <View style={[s.row, { gap: 24 }]}>
                  <Text style={[T.caption, { color: C.text }]}>3%</Text>
                  <Text style={[T.caption, { color: C.description }]}>5%</Text>
                  <Text style={[T.caption, { color: C.description }]}>7%</Text>
                </View>
              </View>
            </View>
            <Divider />
            <Pressable style={s.payRow}>
              <Text style={[T.bodyMedium, { color: C.secondary, flex: 1 }]}>Оплата картой ••• 0000</Text>
              {Icon.chevron()}
            </Pressable>
          </Card>

          {/* Total */}
          <Card style={s.totalCard}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={[T.bodyMedium, { color: C.description }]}>Итого</Text>
              <Text style={[T.display, { color: C.text }]}>{rub(spasibo ? Math.max(0, total - 686) : total)}</Text>
              <Text style={[T.caption, { color: C.description, textAlign: 'center', maxWidth: 300 }]}>
                {`Товары ${rub(goods)} · доставка ${stores.length > 1 && !together ? `${stores.length}${NB}${partsWord} ` : ''}${rub(delivery)} · сборка ${rub(ASSEMBLY)} · промокод −${rub(PROMO)}`}
              </Text>
            </View>
            <Button label={`Оплатить ${rub(spasibo ? Math.max(0, total - 686) : total)}`} onPress={() => showToast('Один платёж за весь заказ')} />
          </Card>
        </View>
      </ScrollView>

      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[s.toast, { bottom: insets.bottom + 24, opacity: toastA, transform: [{ translateY: toastA.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}
        >
          <Text style={[T.captionSemibold, { color: C.white }]}>{toast}</Text>
        </Animated.View>
      )}
    </View>
  );
}

function Timeline({ stores, together }: { stores: Store[]; together: boolean }) {
  const [w, setW] = useState(0);
  const pad = 12;
  const n = stores.length;
  const xs = stores.map((_, i) => pad + ((w - pad * 2) * i) / Math.max(1, n - 1));
  const activeIndex = together ? n - 1 : 0;
  return (
    <View style={{ height: 78 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <>
          <View style={[s.tlLine, { left: pad, width: w - pad * 2 }]} />
          <View style={[s.tlLine, { left: pad, width: together ? w - pad * 2 : 18, backgroundColor: C.brand }]} />
          {stores.map((st, i) => {
            const on = i === activeIndex;
            const align = i === 0 ? 'flex-start' : i === n - 1 ? 'flex-end' : 'center';
            const labelW = 110;
            const left = i === 0 ? 0 : i === n - 1 ? w - labelW : xs[i] - labelW / 2;
            const dim = together && i !== activeIndex;
            return (
              <View key={st}>
                <View style={[s.tlDot, { left: xs[i] - 8 }, on ? { backgroundColor: C.brand, borderColor: C.brand } : null]} />
                <View style={{ position: 'absolute', top: 30, left, width: labelW, alignItems: align, gap: 4, opacity: dim ? 0.35 : 1 }}>
                  <Text style={[T.bodySemibold, { color: C.text }]}>{STORE[st].short}</Text>
                  <View style={s.row4}>
                    <Logo store={st} size={16} />
                    <Text style={[T.small, { color: C.description }]}>{STORE[st].name}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={s.page}>
        <View style={s.device}>
          <Cart />
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const shadow = Platform.select({
  web: { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } as object,
  default: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
});

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#000', alignItems: 'center' },
  device: { flex: 1, width: '100%', maxWidth: 402 },
  root: { flex: 1, backgroundColor: '#000' },
  fill: { width: '100%', height: '100%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  row4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  row6: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#737378', marginBottom: 11 },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 12, gap: 12 },
  address: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 4 },
  share: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.white, borderRadius: 32 },
  listCard: { paddingVertical: 8, paddingHorizontal: 16 },
  waveCard: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 8 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.divider },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  toggle: { width: 40, height: 26, borderRadius: 13, padding: 2 },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.white, ...shadow },
  segmented: { flexDirection: 'row', padding: 3, borderRadius: 100, backgroundColor: C.chip },
  segOption: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 100 },
  segOn: { backgroundColor: C.white, ...shadow },
  tlLine: { position: 'absolute', top: 10, height: 4, borderRadius: 2, backgroundColor: C.chip },
  tlDot: { position: 'absolute', top: 4, width: 16, height: 16, borderRadius: 8, borderWidth: 4, borderColor: C.divider, backgroundColor: C.white },
  waveHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingBottom: 6 },
  storeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingLeft: 4, paddingRight: 10, borderRadius: 100, backgroundColor: C.chip },
  stackLogo: { borderRadius: 9, borderWidth: 2, borderColor: C.white, overflow: 'hidden' },
  item: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  itemImg: { width: 78, height: 78, borderRadius: 16, overflow: 'hidden', backgroundColor: C.bg },
  itemText: { flex: 1, height: 78, justifyContent: 'space-between' },
  itemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 34, paddingHorizontal: 8, borderRadius: 17, backgroundColor: C.bg },
  speedUp: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 12, paddingRight: 8, borderRadius: 16, backgroundColor: C.pinkLight },
  btnS: { minHeight: 36, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 1000, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  btnL: { alignSelf: 'stretch', marginHorizontal: 11, minHeight: 62, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 1000, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  addMore: { paddingTop: 16, paddingBottom: 12, gap: 10 },
  miniImg: { width: 82, height: 82, borderRadius: 24, overflow: 'hidden', backgroundColor: C.bg },
  priceBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 32, paddingLeft: 14, paddingRight: 10, borderRadius: 1000, backgroundColor: C.priceBtn, alignSelf: 'flex-start' },
  spasibo: { width: 18, height: 18, borderRadius: 5.76, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  prime: { width: 16, height: 14, borderRadius: 2, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  seg: { height: 4, borderRadius: 2, backgroundColor: C.bg, overflow: 'hidden' },
  segFill: { height: 4, borderRadius: 2, backgroundColor: C.brand },
  totalCard: { paddingTop: 28, paddingHorizontal: 16, paddingBottom: 32, gap: 24, alignItems: 'center' },
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(32,32,34,0.94)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 100 },
});
