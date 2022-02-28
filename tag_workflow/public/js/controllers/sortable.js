
function sorted(n){
  var table, rows, switching, i, shouldSwitch, dir, switchcount = 0;
  table = document.getElementById("sorting");
  switching = true;
  dir = "asc";
  while (switching) {
    switching = false;
    rows = table.rows;
    let names = checking(rows,n,dir)
    shouldSwitch = names.shouldSwitch
    i = names.i
    if (shouldSwitch) {
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
      switchcount ++;
    } else {
      if (switchcount == 0 && dir == "asc") {
        dir = "desc";
        switching = true;
      }
    }
  }
}


function checking(rows,n,dir) {
  
  for (let i = 1; i < (rows.length - 1); i++) {
    var shouldSwitch = false;
    var x = rows[i].getElementsByTagName("TD")[n];
    var y = rows[i + 1].getElementsByTagName("TD")[n];
    if (dir == "asc") {
      if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
        shouldSwitch = true;
        break;
      }
    } else{
      if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
        shouldSwitch = true;
        break;
      }
    }
  }

  return {shouldSwitch,i};

}