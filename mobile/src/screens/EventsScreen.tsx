/** GreenPath MVP: evidence-labelled food carbon comparison + local event history. */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Card from '../components/ui/Card';
import Screen from '../components/ui/Screen';
import { colors } from '../theme';
import { FOOD_FACTORS, FoodKey, MENUS, MenuKey, compareMenus, menuQuantities } from '../features/carbon';
import { loadEvents, saveEvent, SavedEvent, updateEventLedger } from '../features/eventStorage';
import { calculateLedger, FoodLedgerEntry } from '../features/foodLedger';

const pantryOptions = ['Tortillas', 'Salsa', 'Limones', 'Servilletas'];
const pantryCosts: Record<string, number> = { Tortillas: 40, Salsa: 35, Limones: 20, Servilletas: 25 };
const foods = Object.keys(FOOD_FACTORS) as FoodKey[];
const fmt = (v: number) => v.toFixed(2);
export default function EventsScreen({ onBack }: { onBack?: () => void } = {}) {
  const [guests, setGuests] = useState(8);
  const [budgetText, setBudgetText] = useState('1200');
  const [menu, setMenu] = useState<MenuKey>('equilibrado');
  const [pantry, setPantry] = useState<string[]>(['Tortillas', 'Salsa']);
  const [events, setEvents] = useState<SavedEvent[]>([]);
  const [lastId, setLastId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<FoodLedgerEntry[]>([]);
  const [ledgerFood, setLedgerFood] = useState<FoodKey>('beef');
  const [ledgerInputs, setLedgerInputs] = useState({purchasedGrams:'', consumedGrams:'', savedGrams:'', discardedGrams:''});
  const [busy, setBusy] = useState(false);
  useEffect(() => { loadEvents().then(setEvents); }, []);
  const budget = Number(budgetText) || 0;
  const comparison = useMemo(() => compareMenus(menu, guests), [menu, guests]);
  const quantity = useMemo(() => menuQuantities(menu, guests), [menu, guests]);
  const estimatedCost = Math.max(0, guests * MENUS[menu].pricePerGuestMXN - pantry.reduce((s, x) => s + pantryCosts[x], 0));
  const changeMenu = (next: MenuKey) => { setMenu(next); setLastId(null); };
  const choice = (label: string, action: () => void, active = false) => <Pressable accessibilityRole="button" onPress={action} style={[styles.choice, active && styles.selected]}><Text style={[styles.choiceText, active && styles.activeText]}>{label}</Text></Pressable>;
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const event: SavedEvent = { id: `${Date.now()}-${Math.round(Math.random()*100000)}`, savedAt: new Date().toISOString(), guests, budgetMXN: budget, menu, pantry, estimatedCostMXN: estimatedCost, plannedKgCO2e: comparison.selected.totalKgCO2e, referenceKgCO2e: comparison.baseline.totalKgCO2e };
      await saveEvent(event); setLastId(event.id); setEvents(await loadEvents());
      Alert.alert('Plan guardado', 'Se guardó en este dispositivo. La comparación es hipotética y no genera puntos por CO₂e evitado.');
    } catch { Alert.alert('No se pudo guardar', 'Intenta nuevamente.'); }
    finally { setBusy(false); }
  };
  const ledgerResult = useMemo(() => { try { return calculateLedger(ledger); } catch { return null; } }, [ledger]);
  const addLedger = () => {
    const values = Object.fromEntries(Object.entries(ledgerInputs).map(([key, value]) => [key, Number(value)])) as unknown as Omit<FoodLedgerEntry,'food'>;
    if (Object.values(ledgerInputs).some(v => !v.trim())) return Alert.alert('Faltan cantidades', 'Ingresa las cuatro cantidades, usando 0 cuando corresponda.');
    const entry: FoodLedgerEntry = { food: ledgerFood, ...values };
    const next = [...ledger.filter(x => x.food !== ledgerFood), entry];
    try { calculateLedger(next); setLedger(next); Alert.alert('Alimento registrado', 'Guarda el registro para asociarlo al evento.'); }
    catch (err) { Alert.alert('Revisa las cantidades', err instanceof Error ? err.message : 'Cantidades inválidas'); }
  };
  const saveLedger = async () => {
    if (!lastId) return Alert.alert('Selecciona un evento', 'Primero guarda un plan o selecciona uno del historial.');
    if (!ledger.length) return Alert.alert('Sin alimentos', 'Agrega al menos un alimento.');
    try { calculateLedger(ledger); await updateEventLedger(lastId, ledger); setEvents(await loadEvents()); Alert.alert('Registro guardado', 'Se guardaron los alimentos en este dispositivo.'); }
    catch (err) { Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar'); }
  };
  const openEvent = (event: SavedEvent) => {
    setLastId(event.id);
    setLedger(event.foodLedger ?? []);
    Alert.alert('Evento seleccionado', 'Ahora puedes registrar o editar varios alimentos en la sección de seguimiento.');
  };
  return <Screen title="Mis eventos" subtitle="Carne asada: compara opciones y evita desperdicio" onBack={onBack} backLabel="Volver a Reducir">
    <Card tone="mint" title="🌱 Planea con datos trazables"><Text style={styles.body}>Compara la huella de los ingredientes del menú con factores globales publicados. Los costos y porciones son ejemplos; no son cotizaciones ni emisiones verificadas evitadas.</Text></Card>
    <Card title="1. Invitados y presupuesto">
      <Text style={styles.label}>Invitados</Text><View style={styles.row}>{choice('−', () => { setGuests(n => Math.max(2,n-1)); setLastId(null); })}<Text style={styles.number}>{guests}</Text>{choice('+', () => { setGuests(n => Math.min(30,n+1)); setLastId(null); })}</View>
      <Text style={styles.label}>Presupuesto total (MXN)</Text><TextInput accessibilityLabel="Presupuesto" keyboardType="numeric" value={budgetText} onChangeText={v => { setBudgetText(v.replace(/[^0-9]/g,'')); setLastId(null); }} style={styles.input}/>
    </Card>
    <Card title="2. Compara tres menús">
      {(Object.keys(MENUS) as MenuKey[]).map(k => <View key={k} style={{marginBottom:8}}>{choice(`${MENUS[k].title} · ~$${MENUS[k].pricePerGuestMXN}/persona\n${MENUS[k].note}`, () => changeMenu(k), k===menu)}</View>)}
      <Text style={styles.small}>Los precios y las cantidades son supuestos del prototipo.</Text>
    </Card>
    <Card title="3. Aprovecha tu despensa"><Text style={styles.body}>Marca lo que ya tienes. Solo afecta la estimación del gasto, no la huella de producción del menú.</Text>
      <View style={styles.wrap}>{pantryOptions.map(item => <View key={item} style={{width:'47%'}}>{choice(`${pantry.includes(item)?'✓ ':''}${item}`, () => { setPantry(p => p.includes(item)?p.filter(x=>x!==item):[...p,item]); setLastId(null); }, pantry.includes(item))}</View>)}</View>
    </Card>
    <Card tone="mint" title="4. Tu plan y su huella">
      <Text style={styles.big}>${estimatedCost.toLocaleString('es-MX')} MXN</Text><Text style={styles.body}>{estimatedCost <= budget ? '✓ Dentro del presupuesto ilustrativo' : `⚠ Supera el presupuesto por $${(estimatedCost-budget).toLocaleString('es-MX')}`}</Text>
      <Text style={styles.label}>Ingredientes principales para {guests} personas</Text>
      {comparison.selected.byFood.map(item => <Text key={item.food} style={styles.body}>• {FOOD_FACTORS[item.food].label}: {fmt(item.kg)} kg</Text>)}
      <View style={styles.rule}/>
      <Text style={styles.label}>Huella de producción alimentaria estimada</Text>
      <Text style={styles.big}>{fmt(comparison.selected.totalKgCO2e)} kg CO₂e</Text>
      <Text style={styles.body}>Menú tradicional de referencia: {fmt(comparison.baseline.totalKgCO2e)} kg CO₂e.</Text>
      <Text style={styles.body}>{comparison.differenceKgCO2e >= 0 ? 'Menor huella hipotética' : 'Mayor huella hipotética'}: {fmt(Math.abs(comparison.differenceKgCO2e))} kg CO₂e frente al menú de referencia.</Text>
      <Text style={styles.small}>Fuente: Poore y Nemecek (2018), vía Our World in Data. Promedios globales por kg. Legumbres y maíz se usan como aproximaciones de frijoles y tortillas. No incluye energía de cocinar, viaje de invitados, desechos ni variación de proveedores. No se afirma reducción conseguida.</Text>
      <Text style={styles.small}>Los menús tienen composiciones diferentes: la comparación no implica equivalencia nutricional.</Text>
    </Card>
    <Pressable accessibilityRole="button" onPress={save} disabled={busy} style={styles.save}><Text style={styles.saveText}>{busy?'Guardando...':'Guardar plan en este dispositivo'}</Text></Pressable>
    <Card title="5. Después del evento: seguimiento real">
      <Text style={styles.body}>Registra para cada alimento cuántos gramos compraste, consumiste, guardaste para después y desechaste. No se consideran desperdicio los alimentos guardados.</Text>
      <Text style={styles.label}>Alimento</Text><View style={styles.wrap}>{foods.map(food => <View key={food} style={{width:'47%'}}>{choice(FOOD_FACTORS[food].label,()=>{setLedgerFood(food);const old=ledger.find(x=>x.food===food);setLedgerInputs(old?{purchasedGrams:String(old.purchasedGrams),consumedGrams:String(old.consumedGrams),savedGrams:String(old.savedGrams),discardedGrams:String(old.discardedGrams)}:{purchasedGrams:'',consumedGrams:'',savedGrams:'',discardedGrams:''});},ledgerFood===food)}</View>)}</View>
      {([['purchasedGrams','Comprado (g)'],['consumedGrams','Consumido (g)'],['savedGrams','Guardado para después (g)'],['discardedGrams','Desechado (g)']] as const).map(([key,label]) => <View key={key}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} keyboardType="numeric" value={ledgerInputs[key]} onChangeText={value=>setLedgerInputs(p=>({...p,[key]:value.replace(/[^0-9]/g,'')}))} style={styles.input} placeholder="0"/></View>)}
      {choice('Agregar o actualizar alimento', addLedger)}
      {ledger.map(item=><View key={item.food} style={{marginTop:8}}><Text style={styles.body}>{FOOD_FACTORS[item.food].label}: {item.purchasedGrams} g comprados · {item.consumedGrams} g consumidos · {item.savedGrams} g guardados · {item.discardedGrams} g desechados</Text>{choice('Quitar este alimento',()=>setLedger(p=>p.filter(x=>x.food!==item.food)))}</View>)}
      {ledgerResult && <View><Text style={styles.label}>Resumen del evento</Text><Text style={styles.body}>Comprado: {ledgerResult.purchasedGrams} g · Consumido: {ledgerResult.consumedGrams} g · Guardado: {ledgerResult.savedGrams} g · Desechado: {ledgerResult.discardedGrams} g</Text><Text style={styles.body}>Sin clasificar: {ledgerResult.unaccountedGrams.toFixed(0)} g</Text><Text style={styles.big}>{fmt(ledgerResult.discardedProductionKgCO2e)} kg CO₂e</Text><Text style={styles.small}>Huella de producción incorporada en alimentos desechados. No es reducción conseguida; no incluye tratamiento del residuo.</Text></View>}
      <Pressable accessibilityRole="button" onPress={saveLedger} style={styles.save}><Text style={styles.saveText}>Guardar seguimiento del evento</Text></Pressable>
      <Text style={styles.small}>Guarda el plan primero o selecciona uno del historial. No se otorgan puntos por comparaciones hipotéticas.</Text>
    </Card>
    <Card title="6. Historial local"><Text style={styles.body}>{events.length === 0 ? 'Aún no hay planes guardados.' : `${events.length} plan(es) guardado(s) en este dispositivo.`}</Text>
      {events.slice(0,5).map(e => <View key={e.id} style={{marginTop:10}}><Text style={styles.body}>{new Date(e.savedAt).toLocaleDateString('es-MX')} · {MENUS[e.menu].title} · {e.guests} personas</Text><Text style={styles.small}>Menú: {fmt(e.plannedKgCO2e)} kg CO₂e estimados{e.foodLedger?.length ? ` · ${e.foodLedger.length} alimentos registrados · ${fmt(calculateLedger(e.foodLedger).discardedProductionKgCO2e)} kg CO₂e incorporados en desperdicio` : e.discarded ? ` · Registro anterior: ${e.discarded.grams} g desechados` : ''}</Text>{choice('Seleccionar para seguimiento',()=>openEvent(e),lastId===e.id)}</View>)}
      <Text style={styles.small}>El historial se guarda localmente, no en Supabase. No genera puntos por reducción hipotética.</Text>
    </Card>
  </Screen>;
}
const styles=StyleSheet.create({
  body:{fontSize:14,color:colors.text,lineHeight:21,marginTop:5},label:{fontSize:15,fontWeight:'700',color:colors.forest,marginTop:10,marginBottom:7},small:{fontSize:12,color:colors.text,opacity:0.75,lineHeight:18,marginTop:8},big:{fontSize:28,fontWeight:'800',color:colors.forest},number:{fontSize:22,fontWeight:'800',color:colors.forest,minWidth:35,textAlign:'center'},row:{flexDirection:'row',alignItems:'center',gap:12},wrap:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8},choice:{borderWidth:1,borderColor:'#D2E2D5',borderRadius:12,backgroundColor:'#FFFFFF',paddingVertical:11,paddingHorizontal:12},selected:{backgroundColor:'#E0F1E2',borderColor:'#43895D'},choiceText:{color:colors.text,fontSize:14},activeText:{color:colors.forest,fontWeight:'700'},input:{borderColor:'#C9DACD',borderWidth:1,borderRadius:10,padding:12,color:colors.forest,backgroundColor:'#FFFFFF'},rule:{borderTopColor:'#D4E4D7',borderTopWidth:1,marginTop:14,marginBottom:9},save:{backgroundColor:colors.forest,borderRadius:12,padding:16,marginBottom:12},saveText:{color:'#FFFFFF',fontWeight:'700',textAlign:'center'}
});
