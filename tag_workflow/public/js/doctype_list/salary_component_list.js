frappe.listview_settings["Salary Component"] = {
    onload: function () {
  
        [cur_list.columns[2], cur_list.columns[3]] = [
          cur_list.columns[3],
          cur_list.columns[2],
        ];
        [cur_list.columns[3], cur_list.columns[5]] = [
          cur_list.columns[5],
          cur_list.columns[3],
        ];
    
        cur_list.render_header(cur_list);
      },
}
