
#import "QMAPoiTBVC.h"
#import "QMAPoi.h"
#import "QMATarget.h"
#import "QMAPoiTableViewCell.h"
#import "UIColor+QMARGB.h"


@interface QMAPoiTBVC ()

@property (nonatomic, strong) NSDictionary *colorDictionary;

@end


@implementation QMAPoiTBVC

static const CGFloat kColorButtonCornerRadius = 10; //Half the button's width/height for a circular look

- (void)viewDidLoad {
    
    [super viewDidLoad];
    
    self.colorDictionary = @{@1:[UIColor colorWithHexString:@"#abdf51"],
                             @2:[UIColor colorWithHexString:@"#e7892e"],
                             @3:[UIColor colorWithHexString:@"#04bb9f"],
                             @4:[UIColor colorWithHexString:@"#1cc1ea"],
                             @5:[UIColor colorWithHexString:@"#ffd400"],
                             @6:[UIColor colorWithHexString:@"#e791e4"],
                             @7:[UIColor colorWithHexString:@"#8bb032"]};
    
    //Hide empty cells at the end of the table view
    self.tableView.tableFooterView = [[UIView alloc] initWithFrame:CGRectZero];
}

- (void)setTarget:(QMATarget *)target {

    if (target != _target) {
        
        _target = target;
        
        NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"QMAPoi"];
        request.predicate = [NSPredicate predicateWithFormat:@"target = %@", target];
        request.sortDescriptors = @[[NSSortDescriptor sortDescriptorWithKey:@"label" ascending:YES]];
        [self assignFetchRequest:request];
        
    } else {
        [self assignFetchRequest:nil];
    }
}

- (void)assignFetchRequest:(NSFetchRequest *)fetchRequest {
    NSManagedObjectContext *moc = self.managedDocument.managedObjectContext;
    if (fetchRequest && moc) {
        self.frc = [[NSFetchedResultsController alloc] initWithFetchRequest:fetchRequest
                                                       managedObjectContext:moc
                                                         sectionNameKeyPath:nil
                                                                  cacheName:nil];
    } else {
        self.frc = nil;
    }
}

#pragma mark - UITableViewDataSource

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath {
    
    static NSString *cellIdentifier = @"POICell";
    
    QMAPoiTableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:cellIdentifier];
    
    QMAPoi *poi = [self.frc objectAtIndexPath:indexPath];
    
    cell.colorButton.layer.cornerRadius = kColorButtonCornerRadius;
    cell.colorButton.backgroundColor = self.colorDictionary[poi.color];
    cell.poiLabel.text = poi.label;
    
    return cell;
}

#pragma mark - UITableViewDelegate

- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath {
    if ([self.delegate respondsToSelector:@selector(qmaPoiTBC:didSelectPOI:)]) {
        [self.delegate qmaPoiTBC:self didSelectPOI:[self.frc objectAtIndexPath:indexPath]];
    }
}

@end
