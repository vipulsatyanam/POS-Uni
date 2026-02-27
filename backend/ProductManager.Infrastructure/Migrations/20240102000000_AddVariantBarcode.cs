using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProductManager.Infrastructure.Migrations
{
    public partial class AddVariantBarcode : Migration
    {
        protected override void Up(MigrationBuilder mb)
        {
            mb.AddColumn<string>(
                name: "Barcode",
                table: "ProductVariants",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            mb.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM __EFMigrationsHistory WHERE MigrationId = '20240102000000_AddVariantBarcode')
                INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion) VALUES ('20240102000000_AddVariantBarcode','8.0.0');
            ");
        }

        protected override void Down(MigrationBuilder mb)
        {
            mb.DropColumn(name: "Barcode", table: "ProductVariants");
        }
    }
}
