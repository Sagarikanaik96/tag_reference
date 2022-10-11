/*------------ override baselist view -------------*/
frappe.provide("views");

/*------------------preparing data---------------*/
frappe.views.BaseList.prototype.prepare_data = function(r){
    let data = r.message || {};

    if(data && this.doctype == "Job Order" && frappe.boot.tag.tag_user_info.company_type == "Staffing"){
        this.order_length = data.order_length;
    }

    data = !Array.isArray(data) ? frappe.utils.dict(data.keys, data.values) : data;

    if (this.start === 0) {
        this.data = data;
    }else{
        if(this.radius === "All" && this.len === 0){
            this.data = this.data.concat(data);
        }else{
            this.data = data;
            this.len = this.start;
        }
    }
}


/*--------------updating args----------------*/
frappe.views.BaseList.prototype.get_call_args = function() {
    this.method = "tag_workflow.utils.reportview.get";
    let args = this.get_args();
    args.radius = this.radius;
    args.filter_loc = this.filter_loc;
    args.order_status = this.order_status;
    
    return {
        method: this.method,
        args: args,
        freeze: true,
        freeze_message: __("<b>Loading") + "...</b>",
    };
}

/*-------------------added buttons--------------------*/
frappe.views.BaseList.prototype.setup_paging_area = function() {
    const paging_values = [20, 100, 500];
    const radius = [5, 10, 25, 50, 100];
    this.order_location = [];
    this.radius = 'All';
    this.len = 0;
    this.order_status = 'All'
    this.selected_page_count = 20;
    this.order_length = 0;
    this.filter_loc = [];

    this.update_paging_area(paging_values,radius);
    this.$frappe_list.append(this.$paging_area);

    // set default paging btn active
    this.$paging_area.find(`.btn-paging[data-value="${this.page_length}"]`).addClass("btn-info");

    // order location(s)

    this.$paging_area.on("click", ".btn-paging, .btn-more, .btn-radius", (e) => {
        const $this = $(e.currentTarget);
        if($this.is(".btn-paging")){
            // set active button
            this.$paging_area.find(".btn-paging").removeClass("btn-info");
            $this.addClass("btn-info");
            this.start = 0;
            this.page_length = this.selected_page_count = $this.data().value;
            this.refresh();
        }else if($this.is(".btn-more")){
            this.remove_data();
            this.start = this.start + this.page_length;
            this.page_length = this.selected_page_count;
            
            $(".btn.btn-default.btn-radius.btn-sm.active").removeClass("active");
            $this.addClass("active");
            this.refresh();
            this.update_button();
        }else if($this.is(".btn-radius")){
            let val = $this.data().value;
            $(".btn.btn-default.btn-radius.btn-sm.active").removeClass("active");
            $(".btn.btn-default.btn-more.btn-sm.active").removeClass("active");
            $this.addClass("active");
            /*----------------Display-Modal----------------------------------------------------*/
            this.display_modal(val);
        }
    });
 }

frappe.views.BaseList.prototype.remove_data = function() {
    if(this.doctype == "Job Order" && frappe.boot.tag.tag_user_info.company_type == "Staffing"){
        this.data = [];
    }
}


/*-----------------------order location(s)-------------------------*/
function get_order_location(){
    let order_location = null;
    frappe.call({
        "method": "tag_workflow.utils.reportview.get_location",
        "async": 0,
        "freeze": true,
        "freeze_message":  __("<b>Loading Job Site(s)") + "...</b>",
        "callback": function(r){
            order_location = r.message;
        }
    });
    return order_location;
}

/*----------------------list view count update--------------------*/
frappe.views.ListView.prototype.get_count_str = function(){
    let current_count = this.data.length;
    let count_without_children = this.data.uniqBy((d) => d.name).length;
    
    return frappe.db.count(this.doctype, {
        filters: this.get_filters_for_args()
    }).then(total_count => {
        this.total_count = total_count || current_count;
        this.count_without_children = count_without_children !== current_count ? count_without_children : undefined;
        let str = __('{0} of {1}', [current_count, this.total_count]);
        if (this.count_without_children) {
            str = __('{0} of {1} ({2} rows with children)', [count_without_children, this.total_count, current_count]);
        }
        
        if(this.doctype == "Job Order" && frappe.boot.tag.tag_user_info.company_type == "Staffing"){
            this.total_count = this.data.length;
            str = __('{0} of {1}', [current_count, this.order_length]);
            return str;
        }else{
            return str;
        }
    });
}
/*----------------------------------------------------------------*/
frappe.views.ListView.prototype.display_modal=function(val){
    if(!["Custom Address", "Clear"].includes(val)){
        localStorage.setItem('radius',parseInt(val));
        this.filter_loc.length>0 || localStorage.getItem('location')==1 ?$('.btn-location').addClass('active'):$('.btn-location').removeClass('active');
        this.radius = val;
        this.start = 0;
        this.page_length = 20;
        this.refresh();
    }else if(val == "Custom Address"){
        if([5,10,25,50,100].includes(this.radius))
            document.querySelector(`.btn-loc-rad[data-value="${this.radius}"]`).classList.add('active');
        this.order_location = get_order_location();
        this.create_table(this.order_location);
        this.add_fields = [{label: '', fieldname: 'location', fieldtype: 'HTML',options:this.html}];
        let dialog = new frappe.ui.Dialog({
            title: 'Please select one or more addresses',
            fields: this.add_fields,
        });
        dialog.show();
        dialog.fields_dict['location'].disp_area.querySelector('#main').addEventListener('change',(e)=>check_cells(e))
        dialog.set_primary_action(__('Submit'), function() {
            localStorage.setItem('location',1);
            update_radius();
            cur_list.start = 0;
            cur_list.page_length = 20;
            cur_list.refresh();
            dialog.hide();
            localStorage.setItem(frappe.session.user+'loc',JSON.stringify(cur_list.filter_loc));
            
        });
        setTimeout(()=>{select_deselect_row()},500)    
    }else{
        if(val == "Clear"){
            localStorage.removeItem('location');
            localStorage.removeItem('radius')
            localStorage.removeItem(frappe.session.user+'loc');
            this.len = 0;
            this.start = 0;
            this.page_length = 20;
            this.radius = "All";
            this.filter_loc = [];
            this.refresh();
        }
    }
}
/*----------------------Generate table in Modal--------------------*/
frappe.views.ListView.prototype.create_table =function(location){
  location = location.map(l=>l.split('#'))
  let new_location = [];
  if([5, 10, 25, 50, 100].includes(this.radius)){
    location.filter(loc=>{
    this.data.map(d=>{
        if(d.job_site==loc[0] && !new_location.includes(loc))
            new_location.push(loc);
        })
    })
    }else{
        new_location = location;
    }
  this.html = `<div class="container-fluid">
  <div class="table-responsive">
      <table class="table table-bordered   table-hover">
          <thead>
              <tr>
                  <th class="text-center"><input id="main" data-val="parent" type="checkbox" ></th>
                  <th>Location</th>
                  <th>Company</th>
              </tr>
          </thead>
          <tbody>${location.map((l)=>`
              <tr>
                <td class="text-center"><input class="location" data-val="${l[0]}" value="${l[0]}" type="checkbox">
                </td>
                <td>${l[0]}</td>
                <td>${l[1]}</td>
              </tr>`).join("")}
  
               
          </tbody>
      </table>
  </div>
  </div>
  `;
  let counter = 0;
  frappe.run_serially([
    ()=>{
        location.map((l)=>{
            if(localStorage.getItem('location')==1 && JSON.parse(localStorage.getItem(frappe.session.user+'loc')).includes(l[0])){
                counter++;
                setTimeout(()=>{
                    $(`.location[data-val="${l[0]}"]`).prop('checked',true);  
                },400)
              } 
          })
    },
    ()=>{
        if(location.length==counter && localStorage.getItem('location')==1){
            setTimeout(()=>{
                $('#main[data-val="parent"]').prop('checked',true);
            },300)
        }  
    }]
  )
  
  
}
/*----------------------add_remove_row--------------------*/
frappe.views.ListView.prototype.single_row_event=function(items){
    items.forEach(i => i.addEventListener(
        "change",
        e => {
           if (i.checked){
            add_rows(e.currentTarget.value);
           }else if(!i.checked){
            remove_rows(e.currentTarget.value);
           }
        }));
}
/*----------------------create paging area--------------------*/
frappe.views.ListView.prototype.update_paging_area=function(paging_values,radius){
    this.$paging_area = $(`
        <div class="list-paging-area level">
            <div class="level-left">
                <div class="btn-group">${paging_values.map((value) => `<button type="button" class="btn btn-default btn-sm btn-paging" data-value="${value}">${value}</button>`).join("")}</div>
            </div>
            <div class="level-right"><button class="btn btn-default btn-more btn-sm">${__("Load More")}</button></div>
        </div>`).hide();

    if(this.doctype == "Job Order" && frappe.boot.tag.tag_user_info.company_type == "Staffing"){
        this.$paging_area = $(`
            <div class="list-paging-area level">
                <div class="level-left">
                    <div class="btn-group">${paging_values.map((value) => `<button type="button" class="btn btn-default btn-sm btn-paging" data-value="${value}">${value}</button>`).join("")}</div>
                </div>
                <div class="level-right">${radius.map((value) => `
                    <button class="btn btn-default btn-radius btn-sm btn-loc-rad" data-value="${value}" style="margin-right: 5px;">${value} Miles</button>`).join("")}
                    <button class="btn btn-default btn-radius btn-location btn-sm" data-value="Custom Address" style="margin-right: 5px;">Locations</button>
                    <button class="btn btn-default btn-radius btn-sm" data-value="Clear" style="margin-right: 5px;">Clear</button>
                    <button class="btn btn-default btn-more btn-sm">${__("Load More")}</button>
                </div>
            </div>`).hide();
    }
}
/*---------------------------Updating button-----------------------------------------------------------*/
frappe.views.ListView.prototype.update_button = function(){
    this.filter_loc.length>0 || localStorage.getItem('location')==1 ?$('.btn-location').addClass('active'):$('.btn-location').removeClass('active');
    if ([5,10,25,50,100].includes(this.radius))
            document.querySelector(`.btn-loc-rad[data-value="${this.radius}"]`).classList.add('active');
}
const select_deselect_row =function(e){
    const items = document.querySelectorAll('.location');
    frappe.views.ListView.prototype.single_row_event(items);
    
}
/*----------------------------------check-uncheck cells----------------------------------------------------------------*/
const check_cells = function(e){
    const items = document.querySelectorAll('.location');
        if(e.currentTarget.checked){
            for (let i in items) {
                if (items[i].type == 'checkbox'){
                    items[i].checked = true;
                    add_rows(items[i].value)
                }
            }
        }else{
            for (let i in items) {
                if (items[i].type == 'checkbox'){
                    items[i].checked = false;
                    remove_rows(items[i].value)
                }
            }
        }
}
function remove_rows(val){
    const index = cur_list.filter_loc.indexOf(val)
    index !== -1 ? cur_list.filter_loc.splice(index,1):console.log(index);
    if (parseInt(localStorage.getItem('location'))===1){
        localStorage.setItem(frappe.session.user+'loc',JSON.stringify(cur_list.filter_loc))
    }
}
function add_rows(val){
        if(!cur_list.filter_loc.includes(val))
            cur_list.filter_loc.push(val);
}
/*---------------Clear-Storage---------------------*/
window.onload = function(){
    if (localStorage.getItem('location'))
        localStorage.removeItem('location')
    if (localStorage.getItem('radius'))
        localStorage.removeItem('radius')
    if (localStorage.getItem(frappe.session.user+'loc'))
        localStorage.removeItem(frappe.session.user+'loc')
}
function update_radius(){
    if([5, 10, 25, 50, 100].includes(parseInt(localStorage.getItem('radius'))))
        cur_list.radius = parseInt(localStorage.getItem('radius'));
    else
        cur_list.radius='All'; 
}