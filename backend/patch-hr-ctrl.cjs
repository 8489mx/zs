const fs = require('fs');
let c = fs.readFileSync('c:/zn/backend/src/modules/hr/hr.controller.ts', 'utf8');

const eosPreviewCode = `
  @Get('employees/:id/end-of-service/preview')
  async getEndOfServicePreview(@Param('id', ParseIntPipe) id: number, @Query('endDate') endDate: string, @Req() req: Request) {
    return this.hrService.getEndOfServicePreview(id, endDate, getAuth(req));
  }
`;

const insertIndex = c.indexOf("@Post('employees/:id/end-of-service')");
if (insertIndex > -1) {
  c = c.substring(0, insertIndex) + eosPreviewCode + '\n  ' + c.substring(insertIndex);
  fs.writeFileSync('c:/zn/backend/src/modules/hr/hr.controller.ts', c);
  console.log('Added to controller');
} else {
  console.log("Could not find end of service route");
}
