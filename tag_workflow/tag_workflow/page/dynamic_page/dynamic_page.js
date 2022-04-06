frappe.pages['dynamic_page'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Company',
		single_column: true
	});
	wrapper.face_recognition = new frappe.FaceRecognition(wrapper, page);
}

	frappe.FaceRecognition = Class.extend({
		init: function(wrapper, page) {
			var me = this;
			this.parent = wrapper;
			this.page = this.parent.page;
			setTimeout(function() {
				me.setup(wrapper, page);
			}, 0);
		},
		setup: function(wrapper, page){
			var me = this;
			this.body = $('<div></div>').appendTo(this.page.main);
			$(frappe.render_template('dynamic_page', "")).appendTo(this.body);
			me.show_profile(wrapper,page);
		},
		show_profile: function(_wrapper, _page){
						
			frappe.call({
				method: "tag_workflow.tag_workflow.page.dynamic_page.dynamic_page.get_link1",
				args: { "name": frappe.route_options.company || ''},
				callback: function (r) {
										
					var my_val= r.message[0]
					var txt = ""
					var text = my_val.employees
					for (let i in text) {
						txt += text[i].employee_name + "<br>";
					}
					var industry = ""
					for (var j in my_val.industry_type) {
						industry += my_val.industry_type[j].industry_type + "<br>"
					}

					var count=0
					var rate=""
					for (let k in r.message[1]) {
						count+=1
						rate+= '★'.repeat(r.message[1][k][0]) + "<br>"  + r.message[1][k][1] + "<br>"+ r.message[1][k][2] +"<br>"+ "<br>";

					
					} 
					

					let template = `
				  <div class="container form-section m-auto card-section visible-section" style="max-width: 70%; width: 100%; padding:0; animation: animatop 1.7s cubic-bezier(0.425, 1.14, 0.47, 1.125) forwards;"> 
					<div id="listdata">
					 <div class="user_list border rounded pb-2 pt-4 mb-5">
						<div class="w-100 px-3 d-flex flex-wrap">
							<div class="col-md-6 col-sm-12 company_list">
								<h5 class="col-md-4 px-0" id="comp_name"> ${my_val.name} </h5> 
								<div id="jobsite">
									<div id="address"> ${my_val.address} ${my_val.city} ${my_val.state}</div>
								</div>
								<p class="my-3 rating"> <span class="text-warning"> ★ </span> <span> ${my_val.average_rating||0} </span> <span> <a href="#">  <u> ${count} review </u> </a> </span> </p>
							</div>
							<div class="col-md-6 col-sm-12 order text-left text-md-right ">
								<a href=javascript:new_order()<button type="button" class="btn btn-primary btn-sm mt-1">Place Order</button></a>
							</div>
						</div>
								   
						<div class="accordion mt-4 custom_collapse" id="accordionExample">
							<div class="card">
								<div class="card-header" id="headingOne">
								<h2 class="mb-0">
									<button class="btn btn-link btn-block text-left" type="button" data-toggle="collapse" data-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
									About&nbsp;<span class="px-1 rotate-icon"> &#x2304; </span>
									</button>
								</h2>
								</div>
								<div id="collapseOne" class="collapse show" aria-labelledby="headingOne" data-parent="#accordionExample">
								<div class="card-body">
									${my_val.about_organization}								</div>
								</div>
							</div>
							<div class="card">
								<div class="card-header" id="headingTwo">
								<h2 class="mb-0">
									<button class="btn btn-link btn-block text-left collapsed" type="button" data-toggle="collapse" data-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
									Industries&nbsp; <span class="px-1 rotate-icon"> &#x2304; </span>
									</button>
								</h2>
								</div>
								<div id="collapseTwo" class="collapse" aria-labelledby="headingTwo" data-parent="#accordionExample">
								<div class="card-body">
									<div id="industry"> 
										${industry}
									</div>
								</div>
								</div>
							</div>
							<div class="card">
								<div class="card-header" id="headingThree">
								<h2 class="mb-0">
									<button class="btn btn-link btn-block text-left collapsed" type="button" data-toggle="collapse" data-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
									Team Members&nbsp; <span class="px-1 rotate-icon"> &#x2304; </span>
									</button>
								</h2>
								</div>
								<div id="collapseThree" class="collapse" aria-labelledby="headingThree" data-parent="#accordionExample">
								<div class="card-body">
									<div id="employee"> ${txt} <span> <a href="#" class="badge badge-primary"></a> </span> </div>
								</div>
								</div>
							</div>
							<div class="card">
								<div class="card-header" id="headingFour">
								<h2 class="mb-0">
									<button class="btn btn-link btn-block text-left collapsed" type="button" data-toggle="collapse" data-target="#collapseFour" aria-expanded="false" aria-controls="collapseThree">
									Ratings & Reviews&nbsp; <span class="px-1 rotate-icon "> &#x2304; </span>
									</button>
								</h2>
								</div>
								<div id="collapseFour" class="collapse" aria-labelledby="headingFour" data-parent="#accordionExample">
								<div class="card-body">									
									${rate}									
								</div>
								</div>

							</div>
						</div>
					</div>
			
					
		
					`;
				
					const para = document.createElement("p");
					para.innerHTML = template;
					document.body.appendChild(para);	
									
					
				}
				})
		},
	})

	function new_order(){
		var b=document.getElementById('comp_name').innerHTML
		var doc = frappe.model.get_new_doc("Job Order");
		doc.company = frappe.boot.tag.tag_user_info.company
		doc.staff_company = b
		doc.posting_date_time = frappe.datetime.now_date();  
		frappe.set_route("Form", doc.doctype, doc.name);
	}
