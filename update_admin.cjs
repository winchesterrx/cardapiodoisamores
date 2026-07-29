const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// Update resetForm
code = code.replace(/setFormAddons\(\[\]\);/g, 'setFormAddons([]);\n    setFormKitItems([]);');

// Update editingProduct mapping
code = code.replace(/setFormAddons\(p\.addons\.map\(\(a\) => a\.id\)\);/g, 'setFormAddons(p.addons.map((a) => a.id));\n      setFormKitItems(p.kitItems || []);');

// Update save payload
code = code.replace(/addons: addonsToSave,/g, 'addons: addonsToSave,\n      kitItems: formCategory === "kits" ? formKitItems : [],');

// Add UI for Kit Items
const kitUI = `
                {formCategory === 'kits' && (
                  <div className="space-y-3 border border-border p-3 rounded-lg bg-muted/10">
                    <h4 className="font-medium text-sm text-foreground">Itens do Kit/Combo</h4>
                    <div className="flex gap-2">
                      <select id="kitProductSelect" className="flex-1 border border-border rounded-lg p-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="">Selecione um produto para adicionar...</option>
                        {products.filter(p => p.category !== 'kits').map(p => (
                          <option key={p.id} value={p.id}>{p.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => {
                        const sel = document.getElementById('kitProductSelect') as HTMLSelectElement;
                        if(sel && sel.value) {
                          const existing = formKitItems.find(k => k.productId === sel.value);
                          if(existing) {
                            setFormKitItems(formKitItems.map(k => k.productId === sel.value ? {...k, quantity: k.quantity + 1} : k));
                          } else {
                            setFormKitItems([...formKitItems, {productId: sel.value, quantity: 1}]);
                          }
                          sel.value = '';
                        }
                      }} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">Adicionar</button>
                    </div>
                    
                    {formKitItems.length > 0 && (
                      <ul className="space-y-2 mt-3">
                        {formKitItems.map(k => {
                          const prod = products.find(p => p.id === k.productId);
                          return (
                            <li key={k.productId} className="flex justify-between items-center bg-background border border-border p-2.5 rounded-lg text-sm">
                              <span className="font-medium text-foreground">{k.quantity}x {prod?.name || 'Produto não encontrado'}</span>
                              <div className="flex items-center gap-1.5">
                                <button type="button" onClick={() => setFormKitItems(formKitItems.map(item => item.productId === k.productId ? {...item, quantity: Math.max(1, item.quantity - 1)} : item))} className="w-7 h-7 flex items-center justify-center bg-muted text-muted-foreground rounded-md hover:bg-muted/80">-</button>
                                <button type="button" onClick={() => setFormKitItems(formKitItems.map(item => item.productId === k.productId ? {...item, quantity: item.quantity + 1} : item))} className="w-7 h-7 flex items-center justify-center bg-muted text-muted-foreground rounded-md hover:bg-muted/80">+</button>
                                <button type="button" onClick={() => setFormKitItems(formKitItems.filter(item => item.productId !== k.productId))} className="w-7 h-7 flex items-center justify-center ml-2 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20">X</button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
`;

code = code.replace(/{formCategory === 'essencias' && \(/, kitUI + "\n                {formCategory === 'essencias' && (");

fs.writeFileSync('src/pages/Admin.tsx', code);
console.log("Admin.tsx updated!");
