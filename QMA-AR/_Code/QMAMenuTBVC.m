
#import "QMAMenuTBVC.h"


@interface QMAMenuTBVC ()
@property (weak, nonatomic) IBOutlet UIButton *closeButton;
@end


@implementation QMAMenuTBVC

- (IBAction)didTapMenuButton:(UIButton *)sender {
    sender.hidden = YES;
    [self.delegate qmaMenuDidTapToClose:self];
    [self performSelector:@selector(showCloseButton) withObject:nil afterDelay:1];
}

- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath {
    
    if (indexPath.row == 0) { //Augmented Camera
        [self.delegate qmaMenuDidTapToClose:self];
        
    } else if (indexPath.row == 1) { //About the Panorama
        
    } else if (indexPath.row == 2) { //queensmuseum.org
        
    } else if (indexPath.row == 3) { //Credits
        
    } else if (indexPath.row == 4) { //Share this app
        
    }
    [tableView deselectRowAtIndexPath:indexPath animated:YES];
}

- (void)showCloseButton {
    self.closeButton.hidden = NO;
}

@end
