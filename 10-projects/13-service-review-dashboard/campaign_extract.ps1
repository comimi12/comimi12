param([string]$src,[string]$out)
$name=[IO.Path]::GetFileName($src)
Start-Process -FilePath $src -WindowStyle Minimized
$app=$null; $p=$null
for($i=0;$i -lt 40;$i++){ Start-Sleep -Milliseconds 700
  try{ $app=[Runtime.InteropServices.Marshal]::GetActiveObject("PowerPoint.Application"); foreach($x in $app.Presentations){ if($x.Name -eq $name){$p=$x} } }catch{}
  if($p){break} }
if(-not $p){ "FAIL $src"; exit 1 }
$res=@{file=$src; w=$p.PageSetup.SlideWidth; h=$p.PageSetup.SlideHeight; slides=@()}
foreach($s in $p.Slides){
  $shapes=@()
  function walk($sh,$depth){
    $o=@{name=$sh.Name; type=[int]$sh.Type; l=[math]::Round($sh.Left,1); t=[math]::Round($sh.Top,1); w=[math]::Round($sh.Width,1); h=[math]::Round($sh.Height,1); text=''; fill=''; fsize=0; fcolor=''; bold=0}
    try{ if($sh.Fill.Visible -and $sh.Fill.Type -eq 1){ $o.fill='{0:X6}' -f $sh.Fill.ForeColor.RGB } }catch{}
    try{ $o.ast=[int]$sh.AutoShapeType }catch{}
    try{ $o.rot=$sh.Rotation }catch{}
    try{ if($sh.Line.Visible){ $o.line='{0:X6}' -f $sh.Line.ForeColor.RGB; $o.lw=$sh.Line.Weight } }catch{}
    try{ if($sh.Fill.Visible -and $sh.Fill.Type -ne 1){ $o.ftype=[int]$sh.Fill.Type; $o.fill='{0:X6}' -f $sh.Fill.ForeColor.RGB }; $o.ftr=$sh.Fill.Transparency }catch{}
    try{ if($sh.HasTextFrame -and $sh.TextFrame.HasText){ $tf=$sh.TextFrame; $tr=$tf.TextRange; $o.text=$tr.Text; $o.fsize=$tr.Font.Size; $o.fcolor='{0:X6}' -f $tr.Font.Color.RGB; $o.bold=$tr.Font.Bold
      $o.va=[int]$tf.VerticalAnchor; $o.ml=$tf.MarginLeft; $o.mt=$tf.MarginTop; $o.mr=$tf.MarginRight; $o.mb=$tf.MarginBottom; $o.wrap=[int]$tf.WordWrap
      $paras=@(); foreach($pa in $tr.Paragraphs()){ $runs=@(); foreach($ru in $pa.Runs()){ $runs+=@{t=$ru.Text; s=$ru.Font.Size; c=('{0:X6}' -f $ru.Font.Color.RGB); b=[int]$ru.Font.Bold} }; $paras+=@{al=[int]$pa.ParagraphFormat.Alignment; runs=$runs} }; $o.paras=$paras } }catch{}
    if($sh.HasTable){ $rows=@(); for($r=1;$r -le $sh.Table.Rows.Count;$r++){ $row=@(); for($c=1;$c -le $sh.Table.Columns.Count;$c++){ $row+=$sh.Table.Cell($r,$c).Shape.TextFrame.TextRange.Text }; $rows+=,$row }; $o.table=$rows }
    $script:shapes+=$o
    if($sh.Type -eq 6){ foreach($g in $sh.GroupItems){ walk $g ($depth+1) } }
  }
  foreach($sh in $s.Shapes){ walk $sh 0 }
  $res.slides+=@{idx=$s.SlideIndex; shapes=$shapes}
}
$p.Close()
if($app.Presentations.Count -eq 0){ $app.Quit() }
$res | ConvertTo-Json -Depth 8 | Out-File -Encoding utf8 $out
"OK $out slides=$($res.slides.Count)"
