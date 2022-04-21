frappe.listview_settings["Item"] = {
  hide_name_column: true,
  onload:function(listview) {
    $('[data-fieldname="name"]').attr('placeholder','Job Title');

    frappe.route_options = {
      "company": "",
      };
      const df = {
        condition: "=",
        default: null,
        fieldname: "rate",
        fieldtype: "Autocomplete",
        input_class: "input-xs",
        label: "Rate",
        is_filter: 1,
        onchange: function() {
          cur_list.refresh();
        },
        placeholder: "Rate"
      };
      listview.page.add_field(df, '.standard-filter-section')
  },
  refresh:function(){
    $('div[data-fieldname="item_group"]').hide();

    $('div[data-fieldname="variant_of"]').hide();
    $('div[data-fieldname="name"]').hide()
   
  },
};
frappe.flags.my_list=[]
frappe.flags.company=''
frappe.flags.tag_list=''
setTimeout(function(){
  const btn=document.getElementById('filter_selected_data')
  btn.addEventListener('click',function(){
    btn.style.backgroundColor = '#21B9E4';
    btn.style.color="#fff";
    const btn3=document.getElementById('filter_all_data')
    btn3.style.backgroundColor='White';
    btn3.style.color="black";
    frappe.call({
        method:"tag_workflow.tag_data.my_used_job_title",
        args:{
          company_name:frappe.boot.tag.tag_user_info.company,
          company_type:frappe.boot.tag.tag_user_info.company_type,
        },
        callback:function(r){
          if(frappe.boot.tag.tag_user_info.company_type=='TAG'){
            frappe.flags.tag_list='True'
            frappe.flags.my_list=[]
            frappe.flags.company='False'
            cur_list.refresh()
          }
          else{
            frappe.flags.my_list.push(r.message)
            frappe.flags.company='False'
            frappe.flags.tag_list='False'
            cur_list.refresh()
          }
         
        }
      })
  

  })
  const btn1=document.getElementById('filter_all_data')
    btn1.addEventListener('click',function(){
      btn1.style.backgroundColor = '#21B9E4';
      btn1.style.color="#fff";
      const btn2=document.getElementById('filter_selected_data')
      btn2.style.backgroundColor='White';
      btn2.style.color="black";
      frappe.flags.company='True'
      frappe.flags.my_list=[]
      frappe.flags.tag_list='False'

      cur_list.refresh()


    })
},2000)


frappe.views.BaseList.prototype.prepare_data = function(r) {
  this.page_length = 500;
  let data = r.message || {};
  data = !Array.isArray(data) ?
      frappe.utils.dict(data.keys, data.values) :
      data;
  if (this.start === 0) {
      this.data = data;
  } else {
      this.data = this.data.concat(data);
  }
  if(frappe.flags.company=='True'){
    this.data = data;
  }
  if(frappe.flags.tag_list=='True'){
    this.data = this.data.filter((d) => d.company==null)
  }
  if((frappe.flags.my_list).length>0){
  this.data = this.data.filter((d) => frappe.flags.my_list[0].includes(d.name) || d.company!=null)
  }
  
  this.data = this.data.uniqBy((d) => d.name);
}