/* Shared lexer for the dev checkers (check-static, check-licences): blanks comments (and, in bare, strings, templates and regexes)
   keeping offsets and line breaks. Text only — never executes the code it reads. Returns { code, bare }. */
const KW=new Set(['return','typeof','case','in','of','new','delete','void','throw','instanceof','do','else','yield','await']);
export function lex(src){
  const n=src.length; let code='', bare='', i=0;
  const tpl=[];   // стек глубины фигурных скобок внутри ${…} шаблонов
  let brace=0, last='';   // last — последний значимый символ/слово (для различения / как деления и как регулярки)
  const put=(c,b)=>{ code+=c; bare+=(b===undefined?c:b); };
  const blank=s=>s.replace(/[^\n]/g,' ');
  while(i<n){
    const c=src[i], d=src[i+1];
    if(c==='/'&&d==='/'){ let j=src.indexOf('\n',i); if(j<0) j=n; const s=src.slice(i,j); put(blank(s),blank(s)); i=j; continue; }
    if(c==='/'&&d==='*'){ let j=src.indexOf('*/',i+2); j= j<0 ? n : j+2; const s=src.slice(i,j); put(blank(s),blank(s)); i=j; continue; }
    if(c==="'"||c==='"'){ let j=i+1; while(j<n&&src[j]!==c){ if(src[j]==='\\') j++; j++; } j++; const s=src.slice(i,j); put(s, c+blank(s.slice(1,-1))+c); i=j; last='str'; continue; }
    if(c==='`'||(c==='}'&&tpl.length&&tpl[tpl.length-1]===brace)){
      if(c==='}') tpl.pop();
      let j=i+1; while(j<n){ if(src[j]==='\\'){ j+=2; continue; } if(src[j]==='`'){ j++; break; } if(src[j]==='$'&&src[j+1]==='{'){ j+=2; tpl.push(brace); break; } j++; }
      const s=src.slice(i,j), open=s.endsWith('${'); put(s, s[0]+blank(s.slice(1,open?-1:undefined))+(open?'{':'')); i=j; last='str'; continue;   // keep «{» of «${» so braces balance in bare
    }
    if(c==='/'){
      const regex = last===''||/[(,=:[!&|?{};+\-*%<>~^]/.test(last)||KW.has(last);
      if(regex){ let j=i+1, cls=false; while(j<n){ const e=src[j]; if(e==='\\'){ j+=2; continue; } if(e==='[') cls=true; else if(e===']') cls=false; else if(e==='/'&&!cls) break; else if(e==='\n') break; j++; }
        j++; while(j<n&&/[a-z]/i.test(src[j])) j++; const s=src.slice(i,j); put(s, s.replace(/[^\n]/g,' ')); i=j; last='re'; continue; }
    }
    if(c==='{') brace++; else if(c==='}') brace--;
    if(/[A-Za-z_$]/.test(c)){ let j=i; while(j<n&&/[\w$]/.test(src[j])) j++; const w=src.slice(i,j); put(w); last=w; i=j; continue; }
    if(!/\s/.test(c)) last=c;
    put(c); i++;
  }
  return { code, bare };
}

